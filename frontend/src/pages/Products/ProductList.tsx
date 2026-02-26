import { useEffect, useState } from 'react';
import { Card, Table, Tag, Input, Select, Space, Button, Pagination, Image, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/client';

export default function ProductList() {
    const [products, setProducts] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [shops, setShops] = useState<any[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const page = parseInt(searchParams.get('page') || '1', 10);
    const shopId = searchParams.get('shopId') || '';
    const search = searchParams.get('search') || '';

    useEffect(() => {
        client.get('/shops').then((res) => setShops(res.data.shops)).catch(() => { });
    }, []);

    useEffect(() => {
        if (!shopId && shops.length > 0) {
            setSearchParams({ page: '1', shopId: shops[0].id, search });
            return;
        }
        if (!shopId) { setLoading(false); return; }

        setLoading(true);
        client
            .get(`/products/shops/${shopId}/products`, { params: { page, limit: 20, search: search || undefined } })
            .then((res) => {
                setProducts(res.data.products);
                setTotal(res.data.total);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [page, shopId, search, shops]);

    const statusColors: Record<string, string> = {
        active: 'green', draft: 'blue', inactive: 'default', expired: 'orange', sold_out: 'red',
    };

    const columns = [
        {
            title: 'Image',
            key: 'image',
            width: 60,
            render: (_: any, r: any) => r.primaryImageUrl ? <Image src={r.primaryImageUrl} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-',
        },
        { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v: string) => v || '-' },
        { title: 'Price', dataIndex: 'price', key: 'price', render: (v: number) => `$${Number(v).toFixed(2)}` },
        { title: 'Qty', dataIndex: 'quantity', key: 'qty' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color={statusColors[s] || 'default'}>{s.toUpperCase()}</Tag>,
        },
        {
            title: '',
            key: 'actions',
            render: (_: any, r: any) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/products/${r.id}/edit`)}>
                        Edit
                    </Button>
                    {/* Etsy ToS §1: must link back to product on Etsy */}
                    {r.etsyListingId && (
                        <Tooltip title="View on Etsy">
                            <Button
                                icon={<LinkOutlined />}
                                size="small"
                                href={`https://www.etsy.com/listing/${r.etsyListingId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Card
            title="Products"
            extra={
                shopId && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/products/create?shopId=${shopId}`)}>
                        New Product
                    </Button>
                )
            }
        >
            <Space style={{ marginBottom: 16 }}>
                <Select
                    placeholder="Select Shop"
                    style={{ width: 200 }}
                    value={shopId || undefined}
                    onChange={(v) => setSearchParams({ page: '1', shopId: v, search })}
                    options={shops.map((s: any) => ({ label: s.shopName, value: s.id }))}
                />
                <Input.Search
                    placeholder="Search by title or SKU"
                    defaultValue={search}
                    onSearch={(v) => setSearchParams({ page: '1', shopId, search: v })}
                    style={{ width: 300 }}
                />
            </Space>
            <Table columns={columns} dataSource={products} rowKey="id" loading={loading} pagination={false} size="small" />
            <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Pagination current={page} total={total} pageSize={20} onChange={(p) => setSearchParams({ page: String(p), shopId, search })} />
            </div>
        </Card>
    );
}
