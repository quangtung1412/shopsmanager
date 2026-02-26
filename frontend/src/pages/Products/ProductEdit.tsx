import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Button, message, Spin, Upload, Image, Space } from 'antd';
import { ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons';
import client from '../../api/client';

export default function ProductEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
        client.get(`/products/${id}`).then((res) => {
            const p = res.data.product;
            setProduct(p);
            form.setFieldsValue({
                title: p.title,
                description: p.description,
                price: p.price,
                quantity: p.quantity,
                tags: p.tags?.join(', ') || '',
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id, form]);

    const onFinish = async (values: any) => {
        setSaving(true);
        try {
            await client.patch(`/products/${id}`, {
                ...values,
                tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : [],
            });
            message.success('Product updated on Etsy');
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const uploadImage = async (options: any) => {
        const formData = new FormData();
        formData.append('image', options.file);
        try {
            await client.post(`/products/${id}/images`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('Image uploaded');
            options.onSuccess?.({});
        } catch {
            message.error('Upload failed');
            options.onError?.(new Error('Upload failed'));
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!product) return <div>Product not found</div>;

    return (
        <div>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                Back
            </Button>
            <Card title={`Edit: ${product.title}`}>
                {product.imageUrls?.length > 0 && (
                    <Space style={{ marginBottom: 16 }}>
                        {product.imageUrls.slice(0, 5).map((url: string, i: number) => (
                            <Image key={i} src={url} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
                        ))}
                    </Space>
                )}
                <Upload customRequest={uploadImage} showUploadList={false}>
                    <Button icon={<UploadOutlined />} style={{ marginBottom: 16 }}>Upload Image</Button>
                </Upload>
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <Space>
                        <Form.Item name="price" label="Price (USD)">
                            <InputNumber min={0} precision={2} style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item name="quantity" label="Quantity">
                            <InputNumber min={0} style={{ width: 150 }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="tags" label="Tags (comma separated)">
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={saving}>
                            Save & Push to Etsy
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
