import { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tag } from 'antd';
import { FileExcelOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import client from '../../api/client';
import dayjs from 'dayjs';

export default function InvoiceList() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(dayjs());
    const [modalOpen, setModalOpen] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [form] = Form.useForm();

    const fetchInvoices = () => {
        setLoading(true);
        client.get('/invoices', { params: { date: date.format('YYYY-MM-DD') } })
            .then((res) => {
                setInvoices(res.data.invoices);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchInvoices(); }, [date]);

    const exportFile = async (format: 'xml' | 'excel') => {
        try {
            const res = await client.get('/invoices/export', {
                params: { date: date.format('YYYY-MM-DD'), format },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoices-${date.format('YYYY-MM-DD')}.${format === 'xml' ? 'xml' : 'xlsx'}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            message.error('Export failed');
        }
    };

    const openCreateModal = async () => {
        try {
            const { data } = await client.get('/orders', { params: { limit: 50 } });
            setOrders(data.orders);
            setModalOpen(true);
            form.resetFields();
        } catch {
            message.error('Failed to load orders');
        }
    };

    const handleCreate = async (values: any) => {
        try {
            await client.post('/invoices/generate', values);
            message.success('Invoice created');
            setModalOpen(false);
            fetchInvoices();
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Failed to create invoice');
        }
    };

    const statusColors: Record<string, string> = { draft: 'default', exported: 'blue', submitted: 'green', canceled: 'red' };

    const columns = [
        { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'number' },
        { title: 'Date', dataIndex: 'invoiceDate', key: 'date', render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
        { title: 'Buyer', dataIndex: 'buyerName', key: 'buyer' },
        { title: 'Tax Code', dataIndex: 'buyerTaxCode', key: 'tax', render: (v: string) => v || '-' },
        { title: 'Total (VND)', dataIndex: 'totalWithVat', key: 'total', render: (v: number) => Number(v).toLocaleString('vi-VN') },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color={statusColors[s]}>{s.toUpperCase()}</Tag>,
        },
    ];

    return (
        <>
            <Card
                title="Invoices (Hóa đơn)"
                extra={
                    <Space>
                        <DatePicker value={date} onChange={(d) => d && setDate(d)} />
                        <Button icon={<PlusOutlined />} type="primary" onClick={openCreateModal}>
                            Create Invoice
                        </Button>
                        <Button icon={<FileExcelOutlined />} onClick={() => exportFile('excel')}>
                            Export Excel
                        </Button>
                        <Button icon={<FileTextOutlined />} onClick={() => exportFile('xml')}>
                            Export XML
                        </Button>
                    </Space>
                }
            >
                <Table columns={columns} dataSource={invoices} rowKey="id" loading={loading} size="small" />
            </Card>

            <Modal
                title="Create Invoice from Order"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="orderId" label="Order" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            placeholder="Select order"
                            options={orders.map((o: any) => ({
                                label: `#${o.etsyReceiptId} - ${o.buyerName} ($${Number(o.totalPrice).toFixed(2)})`,
                                value: o.id,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="sellerName" label="Seller Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="sellerTaxCode" label="Seller Tax Code (MST)" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="sellerAddress" label="Seller Address">
                        <Input />
                    </Form.Item>
                    <Form.Item name="buyerName" label="Buyer Name">
                        <Input />
                    </Form.Item>
                    <Form.Item name="buyerTaxCode" label="Buyer Tax Code (MST)">
                        <Input />
                    </Form.Item>
                    <Form.Item name="buyerAddress" label="Buyer Address">
                        <Input />
                    </Form.Item>
                    <Space>
                        <Form.Item name="exchangeRate" label="USD/VND Rate" initialValue={25000}>
                            <InputNumber min={1} style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item name="vatRate" label="VAT (%)" initialValue={0}>
                            <InputNumber min={0} max={100} style={{ width: 100 }} />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </>
    );
}
