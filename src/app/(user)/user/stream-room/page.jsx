'use client';

import AdminPage from '@/app/(user)/components/admin_page';
import { useAppRouter } from '@/hooks/router_hook';
import { CloseOutlined, DeleteOutlined, EditOutlined, IdcardOutlined, PoweroffOutlined, TeamOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { Button, Divider, Flex, Form, Input, Radio, Space, Table, Typography } from 'antd';
import { createParticipantTokenSmManageRoomsV2, createRoomSmManageRooms, deleteRoomSmManageRoomsV2, getAllRoomsSmManageRoomsV2 } from './redux';
import EditConfigRoomModal from './components/edit_config_room_modal';
import { useEffect, useRef } from 'react';
import { T } from '@/app/common';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { TooltipButton } from '@/components/button';
import ConfirmModal from '@/components/confirm_modal';

const livekitRoomPageName = 'livekitRoomPage';
export default function StreamRoomPage() {
    const router = useAppRouter();
    const [form] = Form.useForm();
    const editConfigRef = useRef();
    const dispatch = useAppDispatch();
    const getLivekitRoomsList = async () => {
        await dispatch(getAllRoomsSmManageRoomsV2());
    };
    useEffect(() => {
        getLivekitRoomsList();
    }, []);
    const list = useAppSelector('streamRoom').list;

    const handleJoinRoom = async ({ roomId, mediaServer }) => {
        if (!T.localStorage.storage(livekitRoomPageName)[roomId]) await createParticipantTokenSmManageRoomsV2(roomId);
        mediaServer == 'kurento' ? router.push(`stream-room/mesh/${roomId}`) : router.push(`stream-room/sfu/${roomId}`);
    };

    const handleCreateRoom = () => editConfigRef.current.show();

    const handleDeleteRoom = (record) => ConfirmModal({
        title: 'Confirm delete this room?',
        okText: 'Confirm',
        cancelText: 'Cancel',
        okButtonProps: { icon: <PoweroffOutlined />, color: 'danger', variant: 'solid' },
        cancelButtonProps: { icon: <CloseOutlined /> },
        onOk: async () => {
            const result = await deleteRoomSmManageRoomsV2(record.id);
            result && await getLivekitRoomsList();
        }
    });

    const columns = [
        {
            title: 'Id',
            width: 350,
            dataIndex: 'id',
            key: 'id',
            render: text => <Typography.Text copyable>{text}</Typography.Text>
        },
        {
            title: 'Max participants',
            width: 150,
            dataIndex: 'maxParticipants',
            key: 'maxParticipants'
        },
        {
            title: 'Empty timeout (s)',
            width: 150,
            dataIndex: 'emptyTimeout',
            key: 'emptyTimeout'
        },
        {
            title: 'Action',
            width: 100,
            render: (_, record) => (
                <Space direction='horizontal' size='small'>
                    <TooltipButton title='Edit' icon={<EditOutlined />} onClick={() => editConfigRef.current.show(record)} type='primary' />
                    <TooltipButton title='Delete' icon={<DeleteOutlined />} color='danger' variant='solid' onClick={() => handleDeleteRoom(record)} />
                </Space>
            )
        }
    ];

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
            <EditConfigRoomModal ref={editConfigRef} getLivekitRoomsList={getLivekitRoomsList} />
            <Form
                form={form}
                onFinish={handleJoinRoom}
                layout='horizontal'
                initialValues={{ mediaServer: 'livekit' }}
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
                    <Form.Item name='mediaServer' label='Media server' required>
                        <Radio.Group
                            options={[
                                { value: 'kurento', label: 'Kurento' },
                                { value: 'livekit', label: 'Livekit' }
                            ]}
                        />
                    </Form.Item>
                    <Divider />
                    <Typography.Title level={2} className='text-center w-4/5 !mb-0'>
                        Livekit rooms created
                    </Typography.Title>
                    <Table columns={columns} dataSource={list} pagination={{ pageSize: 10 }} rowKey='id' scroll={{ x: 'max-content' }} />
                </Flex>
            </Form>
        </AdminPage>
    );
}