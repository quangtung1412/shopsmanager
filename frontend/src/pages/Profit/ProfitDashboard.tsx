import { useState } from 'react';
import { Card, DatePicker, Select, Space, Table, Row, Col, Statistic, Tabs } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import client from '../../api/client';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function ProfitDashboard() {
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(30, 'day'),
        dayjs(),
    ]);
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
    const [summary, setSummary] = useState<any[]>([]);
    const [orderProfits, setOrderProfits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const [from, to] = dateRange;
        try {
            const [summaryRes, ordersRes] = await Promise.all([
                client.get('/profit/summary', {
                    params: { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD'), groupBy },
                }),
                client.get('/profit/by-order', {
                    params: { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') },
                }),
            ]);
            setSummary(summaryRes.data.summary);
            setOrderProfits(ordersRes.data.profits);
        } catch { /* */ }
        setLoading(false);
    };

    useState(() => { fetchData(); });

    const totalRevenue = summary.reduce((s, d) => s + d.revenue, 0);
    const totalProfit = summary.reduce((s, d) => s + d.profit, 0);
    const totalOrders = summary.reduce((s, d) => s + d.orderCount, 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const orderColumns = [
        { title: 'Order #', dataIndex: 'etsyReceiptId', key: 'id', render: (v: number) => `#${v}` },
        { title: 'Shop', dataIndex: 'shopName', key: 'shop' },
        { title: 'Date', dataIndex: 'orderDate', key: 'date', render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
        { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', render: (v: number) => `$${v.toFixed(2)}` },
        { title: 'COGS', dataIndex: 'costOfGoods', key: 'cogs', render: (v: number) => `$${v.toFixed(2)}` },
        { title: 'Etsy Fees', dataIndex: 'etsyFees', key: 'fees', render: (v: number) => `$${v.toFixed(2)}` },
        {
            title: 'Profit',
            dataIndex: 'profit',
            key: 'profit',
            render: (v: number) => <span style={{ color: v >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}>${v.toFixed(2)}</span>,
        },
        { title: 'Margin', dataIndex: 'profitMargin', key: 'margin', render: (v: number) => `${v.toFixed(1)}%` },
    ];

    return (
        <div>
            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => { if (dates) setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]); }}
                    />
                    <Select value={groupBy} onChange={setGroupBy} style={{ width: 120 }}
                        options={[
                            { label: 'Daily', value: 'day' },
                            { label: 'Weekly', value: 'week' },
                            { label: 'Monthly', value: 'month' },
                        ]}
                    />
                    <button onClick={fetchData} style={{ padding: '4px 16px', cursor: 'pointer' }}>Refresh</button>
                </Space>

                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Statistic title="Total Revenue" value={totalRevenue} prefix={<DollarOutlined />} precision={2} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Total Profit" value={totalProfit} prefix={totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
                            precision={2} valueStyle={{ color: totalProfit >= 0 ? '#3f8600' : '#cf1322' }} />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Margin" value={margin} precision={1} suffix="%" />
                    </Col>
                    <Col span={6}>
                        <Statistic title="Orders" value={totalOrders} />
                    </Col>
                </Row>

                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#1677ff" name="Revenue" />
                        <Bar dataKey="profit" fill="#52c41a" name="Profit" />
                        <Bar dataKey="etsyFees" fill="#faad14" name="Etsy Fees" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <Card title="Profit by Order" style={{ marginTop: 16 }}>
                <Table columns={orderColumns} dataSource={orderProfits} rowKey="orderId" loading={loading} size="small"
                    pagination={{ pageSize: 20 }} />
            </Card>
        </div>
    );
}
