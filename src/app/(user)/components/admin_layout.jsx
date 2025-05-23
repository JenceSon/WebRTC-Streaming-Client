'use client';
import { Button, Col, Dropdown, Flex, FloatButton, Form, Layout, Modal, Row, Space, Switch, Tooltip, theme as antdTheme } from 'antd';
import { useMediaQuery } from 'react-responsive';
import { useEffect, useRef, useState } from 'react';
import SideNav from './admin_menu';
import HeaderNav from './admin_header';
import { AppstoreOutlined, MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, NotificationOutlined, SunOutlined, SwapOutlined, LogoutOutlined, UserOutlined, DownOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import { CSSTransition, SwitchTransition, TransitionGroup } from 'react-transition-group';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import Link from 'next/link';
import { logoutSystemState } from '@/app/redux';
import { useAppRouter } from '@/hooks/router_hook';
import { T } from '@/app/common';

const { Content } = Layout;

const systemStateUserSetDetail = 'systemStateUser:SetDetail';
const systemStateMenusSetList = 'systemStateMenus:SetList';
export function AdminLayout({ children, menus }) {
    const user = useAppSelector('systemState', 'userReducer').user;
    let items = [
        {
            key: 'PROFILE',
            label: user?.username,
            disabled: true
        },
        {
            type: 'divider'
        },
        {
            key: 'LOG_OUT',
            label: 'Log out',
            icon: <LogoutOutlined />
        }
    ];

    const {
        token: { borderRadius },
    } = antdTheme.useToken();
    const isMobile = useMediaQuery({ maxWidth: 769 });
    const [collapsed, setCollapsed] = useState(true);
    const [navFill, setNavFill] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const location = useRouter();

    const nodeRef = useRef(null);
    const floatBtnRef = useRef(null);
    const dispatch = useAppDispatch();
    const router = useAppRouter();
    const [form] = Form.useForm();

    useEffect(() => {
        setCollapsed(isMobile);
    }, [isMobile]);

    useEffect(() => {
        window?.addEventListener('scroll', () => {
            if (window.scrollY > 5) {
                setNavFill(true);
            } else {
                setNavFill(false);
            }
        });
    }, []);

    const actionTypeDropDown = {
        'LOG_OUT': () => Modal.confirm({
            title: 'Xác nhận đăng xuất khỏi hệ thống',
            onOk: async () => {
                const result = await logoutSystemState();
                if (result) {
                    T.localStorage.storage('authorization', {});
                    router.push('/login');
                    dispatch({ type: systemStateUserSetDetail, payload: { user: null } });
                }
            },
            okButtonProps: { icon: <CheckOutlined /> },
            cancelButtonProps: { icon: <CloseOutlined /> }
        })
    };

    return (
        <>
            <Layout style={{ minHeight: '100vh', }}>
                <SideNav
                    menus={menus}
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    onCollapse={(value) => setCollapsed(value)}
                    style={{
                        overflow: 'auto', position: 'fixed', left: 0, top: 0, bottom: 0, background: 'none', border: 'none', transition: 'all .2s', background: '#fff'
                    }}
                />
                <Layout>
                    <HeaderNav style={{
                        marginLeft: collapsed ? 0 : '200px',
                        padding: '0 2rem 0 0',
                        background: navFill ? '#fff' : '#fff',
                        backdropFilter: navFill ? 'blur(8px)' : 'none',
                        boxShadow: navFill ? '0 0 8px 2px rgba(0, 0, 0, 0.05)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'sticky',
                        top: 0,
                        zIndex: 99,
                        gap: 8,
                        transition: 'all .25s',
                    }} >
                        <Flex align='center'>
                            <Tooltip title={`${collapsed ? 'Expand' : 'Collapse'} Sidebar`}>
                                <Button
                                    type='text'
                                    icon={
                                        collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
                                    }
                                    onClick={() => setCollapsed(!collapsed)}
                                    style={{
                                        fontSize: '16px',
                                        width: 64,
                                        height: 64,
                                    }}
                                />
                            </Tooltip>
                        </Flex>
                        <Flex align='center' gap='small'>
                            <Tooltip title='Apps'>
                                <Button icon={<AppstoreOutlined />} type='text' size='large' />
                            </Tooltip>
                            <Tooltip title='Notification'>
                                <Button icon={<NotificationOutlined />} type='text' size='large' />
                            </Tooltip>
                            <Dropdown
                                menu={{
                                    items,
                                    onClick: e => actionTypeDropDown[e.key] && actionTypeDropDown[e.key]()
                                }}
                                placement='bottomRight' arrow>
                                <Space>
                                    <UserOutlined />
                                    <DownOutlined />
                                </Space>
                            </Dropdown>
                        </Flex>
                    </HeaderNav>
                    <Content
                        style={{
                            margin: `0 0 0 ${collapsed ? 0 : '200px'}`,
                            // background: '#ebedf0',
                            borderRadius: collapsed ? 0 : borderRadius,
                            transition: 'all .25s',
                            padding: '24px 32px',
                            minHeight: 360,
                            position: 'sticky',
                            top: 64,
                            overflowY: 'auto'
                        }}
                    >
                        <TransitionGroup>
                            <SwitchTransition>
                                <CSSTransition
                                    key={`css-transition-${123}`}
                                    nodeRef={nodeRef}
                                    onEnter={() => {
                                        setIsLoading(true);
                                    }}
                                    onEntered={() => {
                                        setIsLoading(false);
                                    }}
                                    timeout={300}
                                    classNames='bottom-to-top'
                                    unmountOnExit
                                >
                                    {() => (
                                        <div ref={nodeRef} style={{ background: 'none' }}>
                                            {children}
                                        </div>
                                    )}
                                </CSSTransition>
                            </SwitchTransition>
                        </TransitionGroup>
                        <div ref={floatBtnRef}>
                            <FloatButton.BackTop />
                        </div>
                    </Content>
                </Layout>
            </Layout>
        </>
    );
}


export function loadMenu() {
    const context = require.context('@/app/', true, /menu\.js$/);
    const menus = context.keys().map((key) => {
        const menu = context(key).default;
        let path = key.replace('./', '').replace('/menu.js', '');

        // Remove dynamic segments (for static routes)
        path = path.replace(/\([^)]+\)\//g, '');

        // Replace dynamic segments [param] with :param (for dynamic routes)
        path = path.replace(/\[([^\]]+)\]/g, ':$1');
        return { ...menu, path: `/${path}` };
    }).filter(menu => menu.label && menu.icon);

    const parentMenus = menus.filter((menu) => !menu.parentMenuKey);
    const childMenus = menus.filter((menu) => menu.parentMenuKey);

    parentMenus.forEach((parentMenu) => {
        parentMenu.key = parentMenu.path;

        parentMenu.children = childMenus.filter((childMenu) => childMenu.parentMenuKey === parentMenu.menuKey).map((childMenu) => {
            childMenu.key = childMenu.path;
            if (childMenu.path) {
                childMenu.label = <Tooltip title={childMenu.label}><Link href={childMenu.path}>{childMenu.label}</Link></Tooltip>;
            }
            delete childMenu.parentMenuKey;
            delete childMenu.menuKey;
            return childMenu;
        });
        if (!parentMenu.children.length) {
            parentMenu.label = <Link href={parentMenu.path}>{parentMenu.label}</Link>;
            delete parentMenu.children;
        }
        delete parentMenu.menuKey;

    });

    return parentMenus;
}