'use client';
import { T } from '@/app/common';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { deleteParticipantSmManageRoomsV2, getRoomSmManageRoomsV2 } from '@/app/(user)/user/stream-room/redux';
import { Col, Divider, Drawer, Flex, Row, Space, Table, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, CloudUploadOutlined, DisconnectOutlined, PauseCircleOutlined, PlayCircleOutlined, PoweroffOutlined, ShareAltOutlined } from '@ant-design/icons';
import { TooltipButton } from '@/components/button';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { useVideoContext } from '../[id]/page';
import { useAppRouter } from '@/hooks/router_hook';
import ConfirmModal from '@/components/confirm_modal';

const RoomDetail = forwardRef((props, ref) => {
    const { id } = useParams();
    const router = useAppRouter();
    const { localParticipant, remoteParticipants } = useVideoContext().room;
    const roomInfo = useAppSelector('streamRoom').room || {};
    const { emptyTimeout = 0, maxParticipants = 0, host } = roomInfo;
    const user = useAppSelector('systemState', 'userReducer').user;
    const [state, setState] = useState({
        selectedRowKeys: [],
        allowSubcribeParticipants: {},
        isOpen: false
    });
    const dispatch = useAppDispatch();
    const getRoomDetail = async () => {
        const result = await dispatch(getRoomSmManageRoomsV2(id));
        !result && router.push('/user/stream-room');
    };

    useEffect(() => {
        getRoomDetail();
    }, []);

    useImperativeHandle(ref, () => ({
        show: () => setState({ ...state, isOpen: true }),
        hide: () => setState({ ...state, isOpen: false })
    }));

    const remoteParticipantsList = Array.from(remoteParticipants.values());

    const columns = [
        {
            title: 'User',
            width: '60%',
            dataIndex: 'name',
            key: 'name',
            render: text => T.string.toUpperCase(text, 'word')
        },
        {
            title: 'Can subcribe your track',
            width: '40%',
            render: (_, { identity }) => state.allowSubcribeParticipants[identity] ?
                <Typography.Text strong className='!text-green-500'>
                    <CheckOutlined />
                    {' Allow'}
                </Typography.Text> :
                <Typography.Text strong className='!text-red-500'>
                    <CloseOutlined />
                    {' Reject'}
                </Typography.Text>
        }
    ];
    const rowSelection = {
        selectedRowKeys: state.selectedRowKeys,
        onChange: selectedRowKeys => setState({ ...state, selectedRowKeys })
    };

    const handleAllowSubscriptionPermission = () => {
        const participantTrackPermission = state.selectedRowKeys.map(participantIdentity => ({ participantIdentity, allowAll: true }));
        localParticipant.setTrackSubscriptionPermissions(false, participantTrackPermission);
        const allowSubcribeParticipants = Object.fromEntries(participantTrackPermission.map(({ participantIdentity }) => [participantIdentity, true]));
        T.message.success('Update permission successfully');
        setState({ ...state, selectedRowKeys: [], allowSubcribeParticipants });
    };

    const handleRejectSubscriptionPermission = () => {
        const participantTrackPermission = remoteParticipantsList
            .filter(({ identity }) => !state.selectedRowKeys.includes(identity))
            .map(({ identity: participantIdentity }) => ({ participantIdentity, allowAll: true }));
        localParticipant.setTrackSubscriptionPermissions(false, participantTrackPermission);
        const allowSubcribeParticipants = Object.fromEntries(participantTrackPermission.map(({ participantIdentity }) => [participantIdentity, true]));
        T.message.success('Update permission successfully');
        setState({ ...state, selectedRowKeys: [], allowSubcribeParticipants });
    };

    const handleRelease = () => ConfirmModal({
        title: 'Confirm release this room?',
        okText: 'Confirm',
        cancelText: 'Cancel',
        okButtonProps: { icon: <PoweroffOutlined />, color: 'danger', variant: 'solid' },
        cancelButtonProps: { icon: <CloseOutlined /> },
        onOk: async () => {
            await deleteParticipantSmManageRoomsV2(id);
        }
    });

    return (
        <Drawer
            title='Room details'
            width={720}
            onClose={() => setState({ ...state, isOpen: false })}
            open={state.isOpen}
        >
            <Space direction='vertical' size='small' className='w-full'>
                <Typography.Title level={4}>Configuration</Typography.Title>
                <Row gutter={16}>
                    <Col span={12}>
                        <Typography.Text>
                            {'Host: '}
                            <Typography.Text strong>{`${T.string.toUpperCase(host?.username, 'word')}${host?.id == user?.id ? ' (You)' : ''}`}</Typography.Text>
                        </Typography.Text>
                    </Col>
                    <Col span={12}>
                        <Typography.Text>
                            {'No. Participants: '}
                            <Typography.Text strong>{remoteParticipants.size + 1}</Typography.Text>
                        </Typography.Text>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Typography.Text>
                            {'Empty timeout: '}
                            <Typography.Text strong>{emptyTimeout}s</Typography.Text>
                        </Typography.Text>
                    </Col>
                    <Col span={12}>
                        <Typography.Text>
                            {'Max participants: '}
                            <Typography.Text strong>{maxParticipants}</Typography.Text>
                        </Typography.Text>
                    </Col>
                </Row>
                <Divider />
                <Typography.Title level={4}>Participants</Typography.Title>
                <Flex gap='small' align='center' justify='flex-end'>
                    <Space direction='horizontal' size='small'>
                        <TooltipButton title='Share Stream to selected users' icon={<ShareAltOutlined />} onClick={handleAllowSubscriptionPermission} className='!bg-green-500 hover:!opacity-75' />
                        <TooltipButton title='Unshare Stream to selected users' icon={<DisconnectOutlined />} onClick={handleRejectSubscriptionPermission} className='!bg-yellow-400 hover:!opacity-75' />
                        {
                            host?.id == user?.id &&
                            <TooltipButton title='Release' icon={<PoweroffOutlined />} onClick={handleRelease} color='danger' variant='solid' />
                        }
                    </Space>
                </Flex>
                <Table rowSelection={rowSelection} columns={columns} dataSource={remoteParticipantsList} pagination={{ pageSize: 10 }} rowKey={record => record.identity} />
            </Space>
        </Drawer>
    );
});

export default RoomDetail;