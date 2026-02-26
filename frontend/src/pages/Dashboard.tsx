import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, DatePicker } from 'antd';
import {
    ShoppingCartOutlined,
    DollarOutlined,
    RiseOutlined,
    AppstoreOutlined,
    ShopOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import client from '../api/client';
import dayjs from 'dayjs';

interface DashboardData {
    today: { orders: number; revenue: number; profit: number };
    overall: { activeProducts: number; activeShops: number };
    recentOrders: any[];
    profitChart: any[];
    shopStats: any[];
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        client.get('/dashboard').then((res) => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!data) return <div>Failed to load dashboard</div>;

    const orderColumns = [
        { title: 'Order', dataIndex: 'etsyReceiptId', key: 'etsyReceiptId', render: (v: number) => `#${v}` },
        { title: 'Shop', dataIndex: 'shopName', key: 'shopName' },
        { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName' },
        {
            title: 'Total',
            key: 'total',
            render: (_: any, r: any) => `$${r.totalPrice?.toFixed(2) || '0.00'}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => {
                const color = s === 'paid' ? 'green' : s === 'shipped' ? 'blue' : s === 'canceled' ? 'red' : 'default';
                return <Tag color={color}>{s.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Date',
            dataIndex: 'paidAt',
            key: 'paidAt',
            render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
        },
    ];

    return (
        <div>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Đơn hôm nay" value={data.today.orders} prefix={<ShoppingCartOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Doanh thu hôm nay" value={data.today.revenue} prefix={<DollarOutlined />} precision={2} suffix="USD" />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Lợi nhuận hôm nay" value={data.today.profit} prefix={<RiseOutlined />} precision={2} suffix="USD" valueStyle={{ color: data.today.profit >= 0 ? '#3f8600' : '#cf1322' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Sản phẩm active" value={data.overall.activeProducts} prefix={<AppstoreOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={16}>
                    <Card title="Doanh thu & Lợi nhuận (30 ngày)">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.profitChart}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#1677ff" name="Doanh thu" />
                                <Bar dataKey="profit" fill="#52c41a" name="Lợi nhuận" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Shop Overview">
                        {data.shopStats.map((shop: any) => (
                            <Card.Grid key={shop.id} style={{ width: '100%', padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong>{shop.shopName}</strong>
                                        <div style={{ fontSize: 12, color: '#888' }}>
                                            {shop.productCount} products · {shop.orderCount} orders
                                        </div>
                                    </div>
                                    <Tag color={shop.status === 'active' ? 'green' : 'red'}>{shop.status}</Tag>
                                </div>
                            </Card.Grid>
                        ))}
                        {data.shopStats.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                                Chưa có shop nào được kết nối
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            <Card title="Đơn hàng gần đây" style={{ marginTop: 16 }}>
                <Table
                    columns={orderColumns}
                    dataSource={data.recentOrders}
                    rowKey="id"
                    pagination={false}
                    size="small"
                />
            </Card>
        </div>
    );
}
