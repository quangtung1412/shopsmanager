import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Space, Input, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import client from '../../api/client';
import dayjs from 'dayjs';

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [trackingCode, setTrackingCode] = useState('');
    const [carrierName, setCarrierName] = useState('');

    useEffect(() => {
        client.get(`/orders/${id}`).then((res) => {
            setOrder(res.data.order);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    const addTracking = async () => {
        if (!trackingCode || !carrierName) {
            message.warning('Please enter tracking code and carrier');
            return;
        }
        try {
            await client.post(`/orders/${id}/tracking`, { tracking_code: trackingCode, carrier_name: carrierName });
            message.success('Tracking added');
            const { data } = await client.get(`/orders/${id}`);
            setOrder(data.order);
        } catch {
            message.error('Failed to add tracking');
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!order) return <div>Order not found</div>;

    const statusColor: Record<string, string> = { paid: 'green', shipped: 'blue', completed: 'cyan', canceled: 'red' };

    const itemColumns = [
        { title: 'Item', dataIndex: 'title', key: 'title' },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v: string) => v || '-' },
        { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Price', dataIndex: 'price', key: 'price', render: (v: number) => `$${Number(v).toFixed(2)}` },
    ];

    return (
        <div>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')} style={{ marginBottom: 16 }}>
                Back to Orders
            </Button>

            <Card title={`Order #${order.etsyReceiptId}`} extra={<Tag color={statusColor[order.status]}>{order.status.toUpperCase()}</Tag>}>
                <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                    <Descriptions.Item label="Shop">{order.shop?.shopName}</Descriptions.Item>
                    <Descriptions.Item label="Buyer">{order.buyerName}</Descriptions.Item>
                    <Descriptions.Item label="Email">{order.buyerEmail}</Descriptions.Item>
                    <Descriptions.Item label="Date">{order.paidAt ? dayjs(order.paidAt).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Subtotal">${Number(order.subtotal).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Shipping">${Number(order.shippingCost).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Tax">${Number(order.salesTax).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Total"><strong>${Number(order.totalPrice).toFixed(2)}</strong></Descriptions.Item>
                    <Descriptions.Item label="Shipping Address" span={2}>{order.shippingAddress || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Tracking">{order.trackingNumber || 'Not shipped'}</Descriptions.Item>
                    <Descriptions.Item label="Carrier">{order.carrierName || '-'}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title="Order Items" style={{ marginTop: 16 }}>
                <Table columns={itemColumns} dataSource={order.items} rowKey="id" pagination={false} size="small" />
            </Card>

            {!order.trackingNumber && order.status !== 'canceled' && (
                <Card title="Add Tracking" style={{ marginTop: 16 }}>
                    <Space>
                        <Input placeholder="Tracking code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
                        <Input placeholder="Carrier (e.g. USPS)" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} />
                        <Button type="primary" onClick={addTracking}>Add Tracking</Button>
                    </Space>
                </Card>
            )}
        </div>
    );
}
