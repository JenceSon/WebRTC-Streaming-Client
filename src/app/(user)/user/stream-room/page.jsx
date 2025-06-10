'use client';

import AdminPage from '@/app/(user)/components/admin_page';
import { useAppRouter } from '@/hooks/router_hook';
import { IdcardOutlined, TeamOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { Button, Divider, Flex, Form, Input, Typography } from 'antd';
import { createRoomSmManageRooms } from './redux';

export default function StreamRoomPage() {
    const router = useAppRouter();
    const [form] = Form.useForm();

    const handleJoinRoom = async ({ roomId }) => {
        router.push(`stream-room/mesh/${roomId}`);
    };

    const handleCreateRoom = async () => {
        const roomId = await createRoomSmManageRooms();
        if (roomId) router.push(`stream-room/mesh/${roomId}`);
    };

    return (
        <AdminPage
            title='Stream Room'
            icon={<TeamOutlined />}
            breadcrumbItems={[
                {
                    title: 'Stream'
                },
                {
                    title: 'Room'
                }
            ]}
        >
            <Form
                form={form}
                onFinish={handleJoinRoom}
                layout='horizontal'
            >
                <Flex vertical gap='small' className='w-full' justify='center' align='center'>
                    <Typography.Title level={2} className='text-center w-4/5 !mb-0'>
                        Live Group Meeting - Collaborate in Real Time
                    </Typography.Title>
                    <Typography.Text className='text-center w-3/4'>
                        Start your own group call or join an existing one.
                    </Typography.Text>
                    <Button type='primary' icon={<VideoCameraAddOutlined />} onClick={handleCreateRoom}>
                        Start new group call
                    </Button>
                    <Typography.Text strong>OR</Typography.Text>
                    <Flex gap='small' justify='center' align='flex-start' className='!w-full'>
                        <Form.Item name='roomId' rules={[{ required: true, message: 'Please enter id of group call' }]} className='!w-1/4'>
                            <Input className='!w-full' prefix={<IdcardOutlined />} placeholder='Join in a group call' />
                        </Form.Item>
                        <Button className='!border-none !shadow-none' onClick={form.submit}>
                            Join
                        </Button>
                    </Flex>
                </Flex>
            </Form>
        </AdminPage>
    );
}