'use client';
import { Logo } from '@/components/logo';
import { COLOR } from '@/context/config_provider';
import { useAppSelector } from '@/hooks/redux_hooks';
import { ConfigProvider, Layout, Menu } from 'antd';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
const { Sider } = Layout;

export default function SideNav({ ...others }) {
    const nodeRef = useRef(null);
    const pathname = usePathname();
    const listParts = pathname.split('/');
    const [openKeys, setOpenKeys] = useState(['']);
    const [current, setCurrent] = useState('');
    const rootSubmenuKeys = others.menus.map((menu) => menu.key);
    const user = useAppSelector('systemState', 'userReducer').user;

    const onOpenChange = (keys) => {
        const latestOpenKey = keys.find((key) => openKeys.indexOf(key) === -1);
        if (latestOpenKey && rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
            setOpenKeys(keys);
        } else {
            setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
        }
    };

    const findCondtions = {
        keyPathCond: menu => menu.key === pathname,
        subpathCond: subpath => subpath.split('/').every((part, idx) => listParts[idx] && part.startsWith(':') || part === listParts[idx])
    };
    useEffect(() => {
        const { keyPathCond, subpathCond } = findCondtions;
        //find if pathname is children or subpath of a children
        let findOpenKeys = others.menus.find((menu) => menu.children?.find((child) => keyPathCond(child) || child.subpaths && child.subpaths.some(path => subpathCond(path)))) || {};
        //find if pathname is parent or subpath of parent (doesn't have children)
        if (!findOpenKeys.key) {
            findOpenKeys = others.menus.find(menu => keyPathCond(menu) || (menu.subpaths && menu.subpaths.some(path => subpathCond(path)))) || {};
        }
        let current;
        //find if pathname is a subpath of a parent => set current is parent
        if (findOpenKeys.subpaths) current = findOpenKeys.subpaths.some(path => subpathCond(path)) && findOpenKeys.key;
        //find if pathname is a subpath of a children => set current is children
        else current = findOpenKeys.children?.find(child => child.subpaths && child.subpaths.some(path => subpathCond(path)))?.key;
        //set default is pathname if current is not a subpath
        if (!current) current = pathname;
        setOpenKeys([findOpenKeys.key]);
        setCurrent(current);
    }, [pathname, others.menus]);
    return (
        <Sider ref={nodeRef} breakpoint='lg' collapsedWidth='0' {...others}>
            <Logo
                title={'WebRTC'}
                logoPublicPath={'/logo.svg'}
                color='blue'
                asLink
                href={'/'}
                justify='center'
                gap='small'
                imgSize={{ h: 28, w: 28 }}
                style={{ padding: '1rem 0' }}
            />
            <ConfigProvider
                theme={{
                    components: {
                        Menu: {
                            itemBg: 'none',
                            itemSelectedBg: COLOR['100'],
                            itemHoverBg: COLOR['50'],
                            itemSelectedColor: COLOR['600'],
                        },
                    },
                }}
            >
                <Menu
                    mode='inline'
                    items={others.menus}
                    openKeys={openKeys}
                    onOpenChange={onOpenChange}
                    selectedKeys={[current]}
                    style={{ border: 'none' }}
                />
            </ConfigProvider>
        </Sider>
    );
}