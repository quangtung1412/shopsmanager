import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, theme } from 'antd';
import {
    DashboardOutlined,
    ShopOutlined,
    ShoppingCartOutlined,
    AppstoreOutlined,
    InboxOutlined,
    LineChartOutlined,
    FileTextOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/shops', icon: <ShopOutlined />, label: 'Shops' },
    { key: '/orders', icon: <ShoppingCartOutlined />, label: 'Orders' },
    { key: '/products', icon: <AppstoreOutlined />, label: 'Products' },
    { key: '/inventory', icon: <InboxOutlined />, label: 'Inventory' },
    { key: '/profit', icon: <LineChartOutlined />, label: 'Profit & Loss' },
    { key: '/invoices', icon: <FileTextOutlined />, label: 'Invoices' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { token: themeToken } = theme.useToken();

    const selectedKey = menuItems.find((item) =>
        location.pathname === item.key || (item.key !== '/' && location.pathname.startsWith(item.key))
    )?.key || '/';

    const userMenuItems = [
        { key: 'profile', label: `${user?.name} (${user?.role})`, disabled: true },
        { type: 'divider' as const },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                theme="light"
                style={{
                    borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                }}
            >
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
                    }}
                >
                    <Typography.Title level={4} style={{ margin: 0, color: themeToken.colorPrimary }}>
                        {collapsed ? 'ERP' : 'Etsy ERP'}
                    </Typography.Title>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
                <Header
                    style={{
                        padding: '0 24px',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                    }}
                >
                    <span
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 18, cursor: 'pointer' }}
                    >
                        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    </span>
                    <Dropdown
                        menu={{
                            items: userMenuItems,
                            onClick: ({ key }) => {
                                if (key === 'logout') logout();
                            },
                        }}
                        placement="bottomRight"
                    >
                        <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar src={user?.avatar} size="small">
                                {user?.name?.[0]}
                            </Avatar>
                            <span>{user?.name}</span>
                        </span>
                    </Dropdown>
                </Header>
                <Content style={{ margin: 24, minHeight: 280 }}>
                    <Outlet />
                </Content>
                {/* Etsy ToS §2: required trademark attribution notice */}
                <Layout.Footer style={{ textAlign: 'center', padding: '12px 24px', fontSize: 11, color: '#999', borderTop: `1px solid ${themeToken.colorBorderSecondary}`, background: '#fff' }}>
                    The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This application uses the Etsy API but is <strong>not endorsed or certified by Etsy, Inc.</strong>
                    &nbsp;|&nbsp;
                    {/* Etsy ToS §1: prominent contact email */}
                    Questions? Contact the developer at{' '}
                    <a href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'admin@etsyerp.local'}`}>
                        {import.meta.env.VITE_CONTACT_EMAIL || 'admin@etsyerp.local'}
                    </a>
                    &nbsp;|&nbsp;
                    <a href="/privacy" target="_blank">Privacy Policy</a>
                    &nbsp;|&nbsp;
                    <a href="/terms" target="_blank">Terms of Use</a>
                </Layout.Footer>
            </Layout>
        </Layout>
    );
}
