import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin } from 'antd';

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const { setToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            navigate('/', { replace: true });
        } else {
            navigate('/login?error=no_token', { replace: true });
        }
    }, [searchParams, setToken, navigate]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spin size="large" tip="Đang xác thực..." />
        </div>
    );
}
