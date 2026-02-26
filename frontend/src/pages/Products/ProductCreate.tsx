import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Select, Button, message, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import client from '../../api/client';

export default function ProductCreate() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const shopId = searchParams.get('shopId');

    const onFinish = async (values: any) => {
        if (!shopId) {
            message.error('Shop ID required');
            return;
        }

        setLoading(true);
        try {
            await client.post(`/products/shops/${shopId}/products`, {
                ...values,
                tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : [],
            });
            message.success('Product created on Etsy');
            navigate(`/products?shopId=${shopId}`);
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                Back
            </Button>
            <Card title="Create New Product">
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <Space>
                        <Form.Item name="price" label="Price (USD)" rules={[{ required: true }]}>
                            <InputNumber min={0} precision={2} style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                            <InputNumber min={1} style={{ width: 150 }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="tags" label="Tags (comma separated)">
                        <Input placeholder="tag1, tag2, tag3" />
                    </Form.Item>
                    <Form.Item name="who_made" label="Who Made" initialValue="i_did">
                        <Select options={[
                            { label: 'I did', value: 'i_did' },
                            { label: 'A member of my shop', value: 'collective' },
                            { label: 'Another company or person', value: 'someone_else' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="when_made" label="When Made" initialValue="made_to_order">
                        <Select options={[
                            { label: 'Made to order', value: 'made_to_order' },
                            { label: '2020-2026', value: '2020_2026' },
                            { label: '2010-2019', value: '2010_2019' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="taxonomy_id" label="Taxonomy ID" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} placeholder="Category ID from Etsy" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Create on Etsy
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
