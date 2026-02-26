import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: () => void;
    logout: () => Promise<void>;
    setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    logout: async () => { },
    setToken: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setLoading(false);
                return;
            }
            const { data } = await client.get('/auth/me');
            setUser(data);
        } catch {
            localStorage.removeItem('accessToken');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = () => {
        window.location.href = `${import.meta.env.VITE_API_URL || ''}/api/auth/google`;
    };

    const logout = async () => {
        try {
            await client.post('/auth/logout');
        } catch { /* ignore */ }
        localStorage.removeItem('accessToken');
        setUser(null);
        window.location.href = '/login';
    };

    const setToken = (token: string) => {
        localStorage.setItem('accessToken', token);
        fetchUser();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
