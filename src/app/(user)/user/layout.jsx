'use client';
import { useEffect, useState } from 'react';
import Metadata from '@/components/meta_data';
import AntdConfigProvider from '@/context/config_provider';
import { AdminLayout, loadMenu } from '../components/admin_layout';
import { useAppDispatch } from '@/hooks/redux_hooks';
import { useAppRouter } from '@/hooks/router_hook';
import { fetchSystemState } from '@/app/redux';
import { T } from '@/app/common';

export default function RootLayout({ children }) {
    const [menus, setMenus] = useState([]);
    const router = useAppRouter();
    const dispatch = useAppDispatch();
    let socket;
    useEffect(() => {
        dispatch(fetchSystemState()).then(result => {
            if (result === false) {
                return router.push('/login');
            };
            const menus = loadMenu();
            setMenus(menus);
        });
        socket = T.socket.create('/signal');
        return socket.close;
    }, []);

    return (
        <>
            <Metadata seoTitle={'User'} seoDescription={'User Description'} />
            <AntdConfigProvider>
                <AdminLayout menus={menus}>
                    {children}
                </AdminLayout>
            </AntdConfigProvider>
        </>
    );
}

