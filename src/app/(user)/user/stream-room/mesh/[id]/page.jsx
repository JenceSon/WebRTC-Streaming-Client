'use client';

import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { useWebRtcMesh } from '@/hooks/web_rtc_mesh_hooks';
import { deleteRoomSmManageRooms, getRoomSmManageRooms } from '@/app/(user)/user/stream-room/redux';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Col, Flex, FloatButton, List, Row, Space, Spin, Table, Typography, Upload } from 'antd';
import AdminPage from '@/app/(user)/components/admin_page';
import { CloseOutlined, PauseCircleOutlined, PlayCircleOutlined, PoweroffOutlined, TeamOutlined, UploadOutlined, UserOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { T } from '@/app/common';
import { TooltipButton } from '@/components/button';
import ConfirmModal from '@/components/confirm_modal';

const VideoContext = createContext();
const useVideoContext = () => useContext(VideoContext);

export default function DetailRoomPage({ params }) {
    const roomId = params.id;
    const dispatch = useAppDispatch();
    const getRoom = async () => await dispatch(getRoomSmManageRooms(roomId));
    const room = useAppSelector('streamRoom').room;
    useEffect(() => {
        getRoom();
        return () => handleClearSrc(true);
    }, []);

    const localVideoRef = useRef();
    const remoteVideoRef = useRef({});
    const remoteStreamRef = useRef({});
    const hiddenVideoRef = useRef();
    const webcamRef = useRef();
    const ontrack = (id, e) => {
        if (remoteVideoRef.current[id]) remoteVideoRef.current[id].srcObject = e.streams[0];
        remoteStreamRef.current[id] = e.streams[0];
    };
    const webRtcMesh = useWebRtcMesh({ socketPath: `/signal-room-mesh/${roomId}`, ontrack });
    const { getRcvPeers, getSndPeer, connect, disconnect, setDefaultTrack, release } = webRtcMesh;

    const handleClearSrc = async (unmount = false) => {
        try {
            hiddenVideoRef.current?.pause();
            hiddenVideoRef.current?.removeAttribute('src');
            webcamRef.current?.getTracks().forEach(track => track.stop() || webcamRef.current.removeTrack(track));
            localVideoRef.current?.pause();
            localVideoRef.current?.removeAttribute('srcObject');
            if (unmount) {
                hiddenVideoRef.current = undefined;
                webcamRef.current = undefined;
                localVideoRef.current = undefined;
            }
            else {
                hiddenVideoRef.current?.load();
                localVideoRef.current?.load();
                await setDefaultTrack();
            }
        } catch (error) {
            T.message.error(error);
        }
    };

    const handleBeforeUpload = async (file) => {
        try {
            await handleClearSrc();
            const url = URL.createObjectURL(file);
            hiddenVideoRef.current.src = url;
            await hiddenVideoRef.current.play();
            const stream = hiddenVideoRef.current.captureStream();
            localVideoRef.current.srcObject = stream;
            const peer = getSndPeer();
            const videoTrack = stream.getVideoTracks()[0];
            peer.videoTransceiver.sender.replaceTrack(videoTrack);
            const audioTrack = stream.getAudioTracks()[0];
            peer.audioTransceiver.sender.replaceTrack(audioTrack);
        } catch (error) {
            console.error(error);
            T.message.error(error);
        }
    };

    const handleUsingWebcam = async () => {
        try {
            await handleClearSrc();
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            webcamRef.current = stream;
            localVideoRef.current.srcObject = stream;
            const peer = getSndPeer();
            const videoTrack = stream.getVideoTracks()[0];
            peer.videoTransceiver.sender.replaceTrack(videoTrack);
            const audioTrack = stream.getAudioTracks()[0];
            peer.audioTransceiver.sender.replaceTrack(audioTrack);
        } catch (error) {
            T.message.error(error);
        }
    };

    if (!room) return (
        <Row gutter={16} className='!h-screen'>
            <Spin tip='loading...' size='large' className='!w-full !self-center !justify-self-center' />
        </Row>
    );

    const rcvPeers = getRcvPeers();
    Object.keys(remoteVideoRef.current).forEach(id => {
        if (!rcvPeers[id]) delete remoteVideoRef.current[id];
    });

    return (<>
        <AdminPage
            title={`Room ${room.roomId}`}
            icon={<TeamOutlined />}
            breadcrumbItems={[
                {
                    title: 'Stream'
                },
                {
                    title: 'Room',
                    href: '/user/stream-room'
                },
                {
                    title: 'Id'
                }
            ]}
        >
            <VideoContext.Provider value={{ remoteVideoRef, rcvPeers, connect, disconnect, remoteStreamRef, release }}>
                <video ref={hiddenVideoRef} autoPlay playsInline muted className='hidden' />
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={24} md={16}>
                        <Flex vertical gap='small' align='flex-start' justify='center'>
                            {
                                !!Object.values(rcvPeers).length && <VideoGridList />
                            }
                            <div className={`!w-${Object.keys(rcvPeers).length ? '2/5 max-w-[40%]' : 'full'} !relative !mx-auto`}>
                                <video ref={localVideoRef} autoPlay playsInline className='!w-full border aspect-video' />
                                <TooltipButton title='Clear source' icon={<CloseOutlined />} onClick={() => handleClearSrc()} color='default' variant='outlined' className='!absolute !top-0 !right-0 z-10' />
                                <Typography.Text className='!text-primary !absolute bottom-0 left-1/2 -translate-x-1/2 !drop-shadow-lg !text-[1.5vw]'>
                                    <UserOutlined />
                                    {' You'}
                                </Typography.Text>
                            </div>
                        </Flex>
                    </Col>
                    <Col xs={24} sm={24} md={8}>
                        <RoomDetail />
                    </Col>
                </Row>
            </VideoContext.Provider>
        </AdminPage>
        <FloatButton.Group>
            <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                <FloatButton icon={<UploadOutlined />} tooltip='Upload video' />
            </Upload>
            <FloatButton tooltip='Using webcam' icon={<VideoCameraAddOutlined />} onClick={handleUsingWebcam} />
        </FloatButton.Group>
    </>);
}

const VideoGridList = () => {
    const { rcvPeers } = useVideoContext();
    const rcvPeersPages = T.lodash.chunk(Object.entries(rcvPeers), 4);
    const [state, setState] = useState({
        current: 1
    });
    return (
        <List
            dataSource={rcvPeersPages}
            renderItem={page => <VideoGridPage page={page} />}
            pagination={{
                current: state.current,
                pageSize: 1,
                total: rcvPeersPages.length,
                onChange: page => setState({ ...state, current: page }),
                align: 'center',
                position: 'bottom'
            }}
            className='w-full'
        />
    );
};

const VideoGridPage = ({ page }) => {
    const { rcvPeers } = useVideoContext();
    const length = page.length;

    if (length == 1 && Object.keys(rcvPeers).length == 1) {
        const id = page[0][0];
        return (
            <StreamingVideo id={id} />
        );
    }
    const rows = T.lodash.chunk(page, 2);
    return (
        <Flex vertical gap='middle'>
            {
                rows.map((row, index) => (
                    <Row gutter={16} key={index}>
                        {
                            row.map(([id, _]) => (
                                <Col key={id} span={12} className='justify-self-center self-center'>
                                    <StreamingVideo id={id} />
                                </Col>
                            ))
                        }
                    </Row>
                ))
            }
        </Flex>
    );
};

const StreamingVideo = ({ id }) => {
    const { remoteVideoRef, rcvPeers, remoteStreamRef } = useVideoContext();
    const videoRef = e => {
        if (e) {
            if (remoteVideoRef.current[id]) e.srcObject = remoteVideoRef.current[id].srcObject;
            else e.srcObject = remoteStreamRef.current[id];
            remoteVideoRef.current[id] = e;
        }
    };
    const user = rcvPeers[id];
    return (
        <div className='!relative w-full !mx-auto'>
            <video ref={videoRef} autoPlay playsInline className='w-full aspect-video border' />
            <Typography.Text className='!text-primary !absolute bottom-0 left-1/2 -translate-x-1/2 !drop-shadow-lg !text-[1.5vw]'>
                <UserOutlined />
                {` ${T.string.toUpperCase(user.username, 'word')}`}
            </Typography.Text>
        </div>
    );
};

const RoomDetail = () => {
    const { connect, disconnect, rcvPeers, release } = useVideoContext();
    const room = useAppSelector('streamRoom').room;
    const host = room.host;
    const user = useAppSelector('systemState', 'userReducer').user;
    const [state, setState] = useState({
        selectedRowKeys: []
    });
    const columns = [
        {
            title: 'User',
            width: '75%',
            dataIndex: [1, 'username'],
            key: 'username',
            render: text => T.string.toUpperCase(text, 'word')
        },
        {
            title: 'Action',
            width: '25%',
            render: (_, [id, __]) => (
                <Space size='small'>
                    <TooltipButton title='Start Stream' icon={<PlayCircleOutlined />} onClick={() => connect(id)} className='!bg-green-500 hover:!opacity-75' />
                    <TooltipButton title='Stop Stream' icon={<PauseCircleOutlined />} onClick={() => disconnect(id)} className='!bg-yellow-400 hover:!opacity-75' />
                </Space>
            )
        }
    ];
    const rowSelection = {
        selectedRowKeys: state.selectedRowKeys,
        onChange: selectedRowKeys => setState({ ...state, selectedRowKeys })
    };

    const handleRelease = () => ConfirmModal({
        title: 'Confirm release this room?',
        okText: 'Confirm',
        cancelText: 'Cancel',
        okButtonProps: { icon: <PoweroffOutlined />, color: 'danger', variant: 'solid' },
        cancelButtonProps: { icon: <CloseOutlined /> },
        onOk: async () => {
            const result = await deleteRoomSmManageRooms(room.roomId);
            result && release();
        }
    });

    return (
        <Space direction='vertical' size='small' className='w-full'>
            <Flex gap='small' align='center' justify='space-between'>
                <Space direction='vertical' size='small'>
                    <Typography.Text>
                        {'Host: '}
                        <Typography.Text strong>{`${T.string.toUpperCase(host.username, 'word')}${host.id == user?.id ? ' (You)' : ''}`}</Typography.Text>
                    </Typography.Text>
                    <Typography.Text>
                        {'No. Participants: '}
                        <Typography.Text strong>{Object.keys(rcvPeers).length + 1}</Typography.Text>
                    </Typography.Text>
                </Space>
                <Space direction='horizontal' size='small'>
                    <TooltipButton title='Start Stream to multiple users' icon={<PlayCircleOutlined />} onClick={() => connect(...state.selectedRowKeys)} className='!bg-green-500 hover:!opacity-75' />
                    <TooltipButton title='Stop Stream to multiple users' icon={<PauseCircleOutlined />} onClick={() => disconnect(...state.selectedRowKeys)} className='!bg-yellow-400 hover:!opacity-75' />
                    {
                        host.id == user?.id &&
                        <TooltipButton title='Release' icon={<PoweroffOutlined />} onClick={handleRelease} color='danger' variant='solid' />
                    }
                </Space>
            </Flex>
            <Table rowSelection={rowSelection} columns={columns} dataSource={Object.entries(rcvPeers)} pagination={{ pageSize: 10 }} rowKey={record => record[0]} />
        </Space>
    );
};