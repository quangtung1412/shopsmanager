import { AppDataSource } from '../config/database';
import { Invoice, InvoiceItem, InvoiceStatus } from '../entities/Invoice';
import { Order } from '../entities/Order';
import { env } from '../config/env';
import * as XLSX from 'xlsx';
import { Builder } from 'xml2js';

export class InvoiceService {
    private static invoiceRepo = () => AppDataSource.getRepository(Invoice);
    private static orderRepo = () => AppDataSource.getRepository(Order);

    /**
     * Generate invoice from order
     */
    static async generateFromOrder(
        orderId: string,
        buyerInfo: {
            buyerName: string;
            buyerTaxCode?: string;
            buyerAddress?: string;
        },
        sellerInfo: {
            sellerName: string;
            sellerTaxCode: string;
            sellerAddress: string;
        },
        options: {
            exchangeRate?: number;
            vatRate?: number;
        } = {}
    ): Promise<Invoice> {
        const order = await this.orderRepo().findOne({
            where: { id: orderId },
            relations: ['items', 'shop'],
        });

        if (!order) {
            throw new Error('Order not found');
        }

        const exchangeRate = options.exchangeRate || env.defaultUsdVndRate;
        const vatRate = options.vatRate || 0;

        // Build invoice items
        const items: InvoiceItem[] = order.items.map((item, index) => {
            const unitPriceVnd = item.price * exchangeRate;
            const amount = unitPriceVnd * item.quantity;
            const vatAmount = amount * (vatRate / 100);

            return {
                lineNumber: index + 1,
                itemName: item.title,
                unit: 'Cái',
                quantity: item.quantity,
                unitPrice: Math.round(unitPriceVnd),
                amount: Math.round(amount),
                vatRate,
                vatAmount: Math.round(vatAmount),
            };
        });

        const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
        const vatAmount = items.reduce((sum, i) => sum + i.vatAmount, 0);

        // Generate invoice number: INV-YYYYMMDD-XXX
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.invoiceRepo().count({
            where: { invoiceDate: today },
        });
        const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(3, '0')}`;

        const invoice = this.invoiceRepo().create({
            orderId,
            invoiceNumber,
            invoiceDate: today,
            sellerName: sellerInfo.sellerName,
            sellerTaxCode: sellerInfo.sellerTaxCode,
            sellerAddress: sellerInfo.sellerAddress,
            buyerName: buyerInfo.buyerName,
            buyerTaxCode: buyerInfo.buyerTaxCode,
            buyerAddress: buyerInfo.buyerAddress,
            items,
            totalAmount,
            vatRate,
            vatAmount,
            totalWithVat: totalAmount + vatAmount,
            currency: 'VND',
            exchangeRate,
            status: InvoiceStatus.DRAFT,
        });

        return this.invoiceRepo().save(invoice);
    }

    /**
     * Export invoices as XML (e-invoice standard format per TT78/2021)
     */
    static async exportToXml(invoiceIds: string[]): Promise<string> {
        const invoices = await this.invoiceRepo().findByIds(invoiceIds);

        const builder = new Builder({
            rootName: 'Invoices',
            xmldec: { version: '1.0', encoding: 'UTF-8' },
        });

        const xmlData = {
            Invoice: invoices.map((inv) => ({
                InvoiceNumber: inv.invoiceNumber,
                InvoiceDate: inv.invoiceDate,
                Seller: {
                    Name: inv.sellerName,
                    TaxCode: inv.sellerTaxCode,
                    Address: inv.sellerAddress,
                },
                Buyer: {
                    Name: inv.buyerName,
                    TaxCode: inv.buyerTaxCode || '',
                    Address: inv.buyerAddress || '',
                },
                Items: {
                    Item: inv.items.map((item) => ({
                        LineNumber: item.lineNumber,
                        ItemName: item.itemName,
                        Unit: item.unit,
                        Quantity: item.quantity,
                        UnitPrice: item.unitPrice,
                        Amount: item.amount,
                        VATRate: item.vatRate,
                        VATAmount: item.vatAmount,
                    })),
                },
                TotalAmount: inv.totalAmount,
                VATRate: inv.vatRate,
                VATAmount: inv.vatAmount,
                TotalWithVAT: inv.totalWithVat,
                Currency: inv.currency,
                ExchangeRate: inv.exchangeRate,
            })),
        };

        return builder.buildObject(xmlData);
    }

    /**
     * Export invoices as Excel (Matbao import format)
     */
    static async exportToExcel(invoiceIds: string[]): Promise<Buffer> {
        const invoices = await this.invoiceRepo().findByIds(invoiceIds);

        // Flatten to rows for Excel
        const rows: any[] = [];

        for (const inv of invoices) {
            for (const item of inv.items) {
                rows.push({
                    'Số hóa đơn': inv.invoiceNumber,
                    'Ngày hóa đơn': inv.invoiceDate,
                    'Tên người bán': inv.sellerName,
                    'MST người bán': inv.sellerTaxCode,
                    'Địa chỉ người bán': inv.sellerAddress,
                    'Tên người mua': inv.buyerName,
                    'MST người mua': inv.buyerTaxCode || '',
                    'Địa chỉ người mua': inv.buyerAddress || '',
                    'STT': item.lineNumber,
                    'Tên hàng hóa/dịch vụ': item.itemName,
                    'Đơn vị tính': item.unit,
                    'Số lượng': item.quantity,
                    'Đơn giá': item.unitPrice,
                    'Thành tiền': item.amount,
                    'Thuế suất (%)': item.vatRate,
                    'Tiền thuế': item.vatAmount,
                    'Tổng thanh toán': inv.totalWithVat,
                    'Loại tiền': inv.currency,
                    'Tỷ giá': inv.exchangeRate,
                });
            }
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 30 },
            { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 5 }, { wch: 40 },
            { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
            { wch: 15 }, { wch: 18 }, { wch: 8 }, { wch: 10 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn');
        return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
    }

    /**
     * Get invoices by date
     */
    static async getByDate(date: string): Promise<Invoice[]> {
        return this.invoiceRepo().find({
            where: { invoiceDate: new Date(date) as any },
            relations: ['order'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Update invoice status
     */
    static async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
        const invoice = await this.invoiceRepo().findOneBy({ id });
        if (!invoice) throw new Error('Invoice not found');

        invoice.status = status;
        if (status === InvoiceStatus.EXPORTED) {
            invoice.exportedAt = new Date();
        }
        return this.invoiceRepo().save(invoice);
    }
}
