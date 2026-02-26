import { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, message, Avatar, Alert } from 'antd';
import { PlusOutlined, SyncOutlined, DeleteOutlined, LinkOutlined, WarningOutlined } from '@ant-design/icons';
import client from '../../api/client';
import dayjs from 'dayjs';

export default function ShopList() {
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);

    const fetchShops = () => {
        setLoading(true);
        client.get('/shops').then((res) => {
            setShops(res.data.shops);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { fetchShops(); }, []);

    const connectShop = async () => {
        try {
            const { data } = await client.get('/etsy/connect');
            window.location.href = data.authUrl;
        } catch (err: any) {
            message.error('Failed to initiate Etsy connection');
        }
    };

    const syncShop = async (shopId: string) => {
        setSyncing(shopId);
        try {
            const { data } = await client.post(`/shops/${shopId}/sync`);
            message.success(`Synced: ${data.synced.products} products, ${data.synced.orders} orders`);
            fetchShops();
        } catch {
            message.error('Sync failed');
        } finally {
            setSyncing(null);
        }
    };

    const disconnectShop = (shopId: string, shopName: string) => {
        Modal.confirm({
            title: `Disconnect ${shopName}?`,
            content: 'This will stop syncing data from this shop.',
            onOk: async () => {
                await client.delete(`/shops/${shopId}`);
                message.success('Shop disconnected');
                fetchShops();
            },
        });
    };

    const columns = [
        {
            title: 'Shop',
            key: 'shop',
            render: (_: any, r: any) => (
                <Space>
                    <Avatar src={r.shopIcon} shape="square">{r.shopName?.[0]}</Avatar>
                    <div>
                        <div><strong>{r.shopName}</strong></div>
                        <div style={{ fontSize: 12, color: '#888' }}>ID: {r.etsyShopId}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => {
                const color = s === 'active' ? 'green' : s === 'token_expired' ? 'orange' : 'red';
                return <Tag color={color}>{s.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Notifications',
            key: 'notifications',
            render: (_: any, r: any) => (
                <Space>
                    {r.telegramEnabled && <Tag color="blue">Telegram</Tag>}
                    {r.emailEnabled && <Tag color="cyan">Email</Tag>}
                    {!r.telegramEnabled && !r.emailEnabled && <Tag>None</Tag>}
                </Space>
            ),
        },
        {
            title: 'Last Sync',
            dataIndex: 'lastSyncAt',
            key: 'lastSyncAt',
            render: (d: string) => {
                if (!d) return <Tag color="red">Never synced</Tag>;
                const ageHours = dayjs().diff(dayjs(d), 'hour');
                // Etsy ToS §1: item content must not be more than 6 hours old
                const stale = ageHours >= 6;
                return (
                    <Space>
                        <span style={{ color: stale ? '#cf1322' : undefined }}>
                            {dayjs(d).format('DD/MM/YYYY HH:mm')}
                        </span>
                        {stale && (
                            <Tag color="red" icon={<WarningOutlined />}>
                                Stale ({ageHours}h) — resync required
                            </Tag>
                        )}
                    </Space>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, r: any) => (
                <Space>
                    <Button
                        icon={<SyncOutlined spin={syncing === r.id} />}
                        onClick={() => syncShop(r.id)}
                        loading={syncing === r.id}
                        size="small"
                    >
                        Sync
                    </Button>
                    {r.shopUrl && (
                        <Button icon={<LinkOutlined />} href={r.shopUrl} target="_blank" size="small">
                            Etsy
                        </Button>
                    )}
                    <Button
                        icon={<DeleteOutlined />}
                        onClick={() => disconnectShop(r.id, r.shopName)}
                        danger
                        size="small"
                    />
                </Space>
            ),
        },
    ];

    return (
        <Card
            title="Etsy Shops"
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={connectShop}>
                    Connect Shop
                </Button>
            }
        >
            <Table columns={columns} dataSource={shops} rowKey="id" loading={loading} />
        </Card>
    );
}
