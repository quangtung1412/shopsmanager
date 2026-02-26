import { useEffect, useState } from 'react';
import { Card, Tabs, Form, Input, Switch, Button, message, Select, Space } from 'antd';
import client from '../../api/client';

export default function Settings() {
    const [shops, setShops] = useState<any[]>([]);
    const [selectedShop, setSelectedShop] = useState<string>('');
    const [notifForm] = Form.useForm();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        client.get('/shops').then((res) => {
            setShops(res.data.shops);
            if (res.data.shops.length > 0) setSelectedShop(res.data.shops[0].id);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!selectedShop) return;
        const shop = shops.find((s) => s.id === selectedShop);
        if (shop) {
            notifForm.setFieldsValue({
                telegramEnabled: shop.telegramEnabled,
                telegramChatId: shop.telegramChatId,
                emailEnabled: shop.emailEnabled,
                notificationEmail: shop.notificationEmail,
            });
        }
    }, [selectedShop, shops, notifForm]);

    const saveNotifications = async (values: any) => {
        setSaving(true);
        try {
            await client.patch(`/shops/${selectedShop}`, values);
            message.success('Settings saved');
            const { data } = await client.get('/shops');
            setShops(data.shops);
        } catch {
            message.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const testTelegram = async () => {
        try {
            const chatId = notifForm.getFieldValue('telegramChatId');
            const { data } = await client.post('/notifications/test/telegram', { chatId });
            data.success ? message.success('Test sent!') : message.error('Failed to send');
        } catch {
            message.error('Test failed');
        }
    };

    const testEmail = async () => {
        try {
            const email = notifForm.getFieldValue('notificationEmail');
            const { data } = await client.post('/notifications/test/email', { email });
            data.success ? message.success('Test email sent!') : message.error('Failed to send');
        } catch {
            message.error('Test failed');
        }
    };

    return (
        <Card title="Settings">
            <Tabs items={[
                {
                    key: '1',
                    label: 'Notifications',
                    children: (
                        <div style={{ maxWidth: 500 }}>
                            <Select
                                placeholder="Select Shop"
                                style={{ width: 250, marginBottom: 16 }}
                                value={selectedShop || undefined}
                                onChange={setSelectedShop}
                                options={shops.map((s: any) => ({ label: s.shopName, value: s.id }))}
                            />
                            <Form form={notifForm} layout="vertical" onFinish={saveNotifications}>
                                <Card title="Telegram" size="small" style={{ marginBottom: 16 }}>
                                    <Form.Item name="telegramEnabled" valuePropName="checked" label="Enable Telegram">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item name="telegramChatId" label="Chat ID">
                                        <Input placeholder="e.g. 123456789" />
                                    </Form.Item>
                                    <Button size="small" onClick={testTelegram}>Test Telegram</Button>
                                </Card>
                                <Card title="Email" size="small" style={{ marginBottom: 16 }}>
                                    <Form.Item name="emailEnabled" valuePropName="checked" label="Enable Email">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item name="notificationEmail" label="Email Address">
                                        <Input placeholder="your@email.com" />
                                    </Form.Item>
                                    <Button size="small" onClick={testEmail}>Test Email</Button>
                                </Card>
                                <Button type="primary" htmlType="submit" loading={saving}>
                                    Save Settings
                                </Button>
                            </Form>
                        </div>
                    ),
                },
            ]} />
        </Card>
    );
}
