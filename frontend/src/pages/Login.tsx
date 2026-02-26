import { Button, Card, Typography, Space } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { user, loading, login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) navigate('/');
    }, [user, loading, navigate]);

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <Card style={{ width: 400, textAlign: 'center' }}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Typography.Title level={2} style={{ margin: 0 }}>
                        🛒 Etsy ERP
                    </Typography.Title>
                    <Typography.Text type="secondary">
                        Quản lý shop Etsy chuyên nghiệp
                    </Typography.Text>
                    <Button
                        type="primary"
                        icon={<GoogleOutlined />}
                        size="large"
                        block
                        onClick={login}
                        loading={loading}
                    >
                        Đăng nhập bằng Google
                    </Button>
                    {/* Etsy ToS §2: required trademark attribution */}
                    <Typography.Text style={{ fontSize: 11, color: '#aaa', display: 'block', lineHeight: 1.4 }}>
                        The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This application uses the
                        Etsy API but is not endorsed or certified by Etsy, Inc.
                    </Typography.Text>
                </Space>
            </Card>
        </div>
    );
}
