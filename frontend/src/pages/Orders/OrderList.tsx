import { useEffect, useState } from 'react';
import { Card, Table, Tag, Input, Select, Space, Button, Pagination } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import dayjs from 'dayjs';

export default function OrderList() {
    const [orders, setOrders] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const page = parseInt(searchParams.get('page') || '1', 10);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    useEffect(() => {
        setLoading(true);
        client
            .get('/orders', { params: { page, limit: 20, status: status || undefined, search: search || undefined } })
            .then((res) => {
                setOrders(res.data.orders);
                setTotal(res.data.total);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [page, status, search]);

    const columns = [
        { title: 'Order #', dataIndex: 'etsyReceiptId', key: 'id', render: (v: number) => `#${v}` },
        { title: 'Shop', key: 'shop', render: (_: any, r: any) => r.shop?.shopName || '-' },
        { title: 'Buyer', dataIndex: 'buyerName', key: 'buyer' },
        { title: 'Total', key: 'total', render: (_: any, r: any) => `$${Number(r.totalPrice).toFixed(2)}` },
        { title: 'Items', key: 'items', render: (_: any, r: any) => r.items?.length || 0 },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => {
                const colors: Record<string, string> = { paid: 'green', shipped: 'blue', completed: 'cyan', canceled: 'red', refunded: 'orange' };
                return <Tag color={colors[s] || 'default'}>{s.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Date',
            dataIndex: 'paidAt',
            key: 'date',
            render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
        },
        {
            title: '',
            key: 'actions',
            render: (_: any, r: any) => (
                <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/orders/${r.id}`)}>
                    Detail
                </Button>
            ),
        },
    ];

    return (
        <Card title="Orders">
            <Space style={{ marginBottom: 16 }}>
                <Input.Search
                    placeholder="Search by buyer or order #"
                    defaultValue={search}
                    onSearch={(v) => setSearchParams({ page: '1', status, search: v })}
                    style={{ width: 300 }}
                />
                <Select
                    placeholder="Status"
                    allowClear
                    style={{ width: 150 }}
                    value={status || undefined}
                    onChange={(v) => setSearchParams({ page: '1', status: v || '', search })}
                    options={[
                        { label: 'Paid', value: 'paid' },
                        { label: 'Shipped', value: 'shipped' },
                        { label: 'Completed', value: 'completed' },
                        { label: 'Canceled', value: 'canceled' },
                    ]}
                />
            </Space>
            <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} pagination={false} />
            <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Pagination
                    current={page}
                    total={total}
                    pageSize={20}
                    showTotal={(t) => `Total ${t} orders`}
                    onChange={(p) => setSearchParams({ page: String(p), status, search })}
                />
            </div>
        </Card>
    );
}
