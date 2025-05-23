'use client';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Tabs } from 'antd';
import { useEffect } from 'react';
import { useAppRouter } from '@/hooks/router_hook';
import { fetchSystemState, loginSystemState, signUpSystemState } from '@/app/redux';
import { useAppDispatch } from '@/hooks/redux_hooks';
import { T } from '../common';

export default function LoginPage() {
    const dispatch = useAppDispatch();
    const router = useAppRouter();
    const [form] = Form.useForm();

    useEffect(() => {
        dispatch(fetchSystemState()).then(result => {
            if (result) {
                router.push('/user');
            }
            else {
                T.localStorage.storage('authorization', {});
            }
        });
    }, []);

    const handleLogin = async values => {
        const { username, password } = values;
        const data = { password, username };
        const result = await dispatch(loginSystemState(data));
        result && router.push('/user');
    };

    const handleRegister = async (values) => {
        const { username, password } = values;
        const result = await signUpSystemState({ username, password });
        result && await handleLogin({ username, password });
    };

    return (
        <div className='flex justify-center items-center mb-40 mt-40 '>
            <Card className='w-full max-w-md shadow-xl rounded-2xl p-6 '>
                <Tabs
                    defaultActiveKey='login_tab'
                    className='min-h-70%'
                    items={[
                        {
                            key: 'login_tab',
                            label: 'Đăng nhập',
                            children: (
                                <Form
                                    onFinish={handleLogin}
                                >
                                    <Form.Item name='username' rules={[{ required: true, message: 'Vui lòng nhập email hoặc username!' }]}>
                                        <Input placeholder='Username hoặc email' prefix={<UserOutlined />} />
                                    </Form.Item>
                                    <Form.Item name='password' rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
                                        <Input.Password placeholder='Mật khẩu' prefix={<LockOutlined />} />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type='primary' className='w-full' htmlType='submit'>
                                            Đăng nhập
                                        </Button>
                                    </Form.Item>
                                </Form>
                            )
                        },
                        {
                            key: 'register_tab',
                            label: 'Tạo tài khoản',
                            children: (
                                <Form
                                    onFinish={handleRegister}
                                    form={form}
                                >
                                    <Form.Item name='username' rules={[{ required: true, message: 'Vui lòng nhập username!' }]}>
                                        <Input placeholder='Username' prefix={<UserOutlined />} />
                                    </Form.Item>
                                    <Form.Item name='password' rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
                                        <Input.Password placeholder='Mật khẩu' prefix={<LockOutlined />} />
                                    </Form.Item>
                                    <Form.Item name='confirmPassword' rules={[
                                        { required: true, message: 'Vui lòng nhập lại mật khẩu!' },
                                        ({ getFieldValue }) => ({
                                            validator: (_, value) => {
                                                if (!value || value === getFieldValue('password')) return Promise.resolve();
                                                return Promise.reject(new Error('Mật khẩu không khớp!'));
                                            }
                                        })
                                    ]}>
                                        <Input.Password placeholder='Xác nhận mật khẩu' prefix={<LockOutlined />} />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type='primary' htmlType='submit' className='w-full'>
                                            Tạo tài khoản
                                        </Button>
                                    </Form.Item>
                                </Form>
                            )
                        }
                    ]}
                >
                </Tabs>
            </Card>
        </div>
    );
} 