import { useEffect, useState } from 'react';
import { Card, Table, Select, Space, Tag, InputNumber, Button, message, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import client from '../../api/client';

export default function InventoryList() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [shops, setShops] = useState<any[]>([]);
    const [shopId, setShopId] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'import' | 'export' | 'adjustment'>('import');
    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        client.get('/shops').then((res) => setShops(res.data.shops)).catch(() => { });
    }, []);

    const fetchInventory = (sid?: string) => {
        setLoading(true);
        client.get('/inventory', { params: { shopId: sid || shopId || undefined } })
            .then((res) => {
                setInventory(res.data.inventory);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchInventory(); }, [shopId]);

    const openModal = (variant: any, type: 'import' | 'export' | 'adjustment') => {
        setSelectedVariant(variant);
        setModalType(type);
        setModalOpen(true);
        form.resetFields();
    };

    const handleSubmit = async (values: any) => {
        try {
            const endpoint = `/inventory/${modalType === 'adjustment' ? 'adjust' : modalType}`;
            await client.post(endpoint, {
                productVariantId: selectedVariant.productVariantId,
                ...values,
            });
            message.success(`${modalType} recorded`);
            setModalOpen(false);
            fetchInventory();
        } catch {
            message.error('Failed to record movement');
        }
    };

    const columns = [
        { title: 'Product', dataIndex: 'productTitle', key: 'title', ellipsis: true },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v: string) => v || '-' },
        {
            title: 'Stock',
            dataIndex: 'stock',
            key: 'stock',
            render: (v: number) => {
                const num = Number(v);
                const color = num <= 0 ? 'red' : num < 5 ? 'orange' : 'green';
                return <Tag color={color}>{num}</Tag>;
            },
        },
        {
            title: 'Last Cost',
            dataIndex: 'lastCostPrice',
            key: 'cost',
            render: (v: number) => v ? `$${Number(v).toFixed(2)}` : '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, r: any) => (
                <Space>
                    <Button size="small" type="primary" onClick={() => openModal(r, 'import')}>Import</Button>
                    <Button size="small" onClick={() => openModal(r, 'export')}>Export</Button>
                    <Button size="small" onClick={() => openModal(r, 'adjustment')}>Adjust</Button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Card title="Inventory">
                <Space style={{ marginBottom: 16 }}>
                    <Select
                        placeholder="All Shops"
                        allowClear
                        style={{ width: 200 }}
                        value={shopId || undefined}
                        onChange={(v) => setShopId(v || '')}
                        options={shops.map((s: any) => ({ label: s.shopName, value: s.id }))}
                    />
                </Space>
                <Table columns={columns} dataSource={inventory} rowKey="productVariantId" loading={loading} size="small" />
            </Card>

            <Modal
                title={`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} - ${selectedVariant?.sku || selectedVariant?.productTitle}`}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                        <InputNumber min={modalType === 'adjustment' ? -9999 : 1} style={{ width: '100%' }} />
                    </Form.Item>
                    {modalType === 'import' && (
                        <Form.Item name="costPrice" label="Cost Price (USD)">
                            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                        </Form.Item>
                    )}
                    <Form.Item name="note" label="Note">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
