'use client';

import AdminPage from '@/app/(user)/components/admin_page';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { CloseOutlined, PlayCircleOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import { getRoomSmManageRooms } from '../redux';
import { useEffect, useRef } from 'react';
import { Flex, Row, Space, Spin, Upload } from 'antd';
import { useWebRtc } from '@/hooks/web_rtc_hooks';
import { TooltipButton } from '@/components/button';

export default function DetailRoomPage({ params }) {
    const roomId = params.id;
    const dispatch = useAppDispatch();
    const getRoom = async () => await dispatch(getRoomSmManageRooms(roomId));
    const room = useAppSelector('streamRoom').room;
    useEffect(() => {
        getRoom();
    }, []);

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const hiddenVideoRef = useRef();
    const ontrack = e => {
        remoteVideoRef.current.srcObject = e.streams[0];
    };
    const webRtc = useWebRtc({ socketPath: `/signal-room/${roomId}`, ontrack });
    const { connectPeer, stream, getPeer, disconnectStream, releaseP2P, getCallingUser, setDefaultTrack, streamRoom } = webRtc;

    const handleClearSrc = async () => {
        hiddenVideoRef.current.pause();
        hiddenVideoRef.current.removeAttribute('src');
        hiddenVideoRef.current.load();
        localVideoRef.current.removeAttribute('srcObject');
        localVideoRef.current.load();
        await setDefaultTrack();
    };

    const handleBeforeUpload = async (file) => {
        const url = URL.createObjectURL(file);
        hiddenVideoRef.current.src = url;
        try {
            await hiddenVideoRef.current.play();
            const stream = hiddenVideoRef.current.captureStream();
            localVideoRef.current.srcObject = stream;
            const peer = getPeer();
            const videoTrack = stream.getVideoTracks()[0];
            peer.videoTransceiver.sender.replaceTrack(videoTrack);
            const audioTrack = stream.getAudioTracks()[0];
            peer.audioTransceiver.sender.replaceTrack(audioTrack);
        } catch (error) {
            console.error(error);
            T.message.error(error);
        }
    };
    if (!room) return (
        <Row gutter={16} className='!h-screen'>
            <Spin tip='loading...' size='large' className='!w-full !self-center !justify-self-center' />
        </Row>
    );
    return (
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
            <video ref={hiddenVideoRef} playsInline muted className='hidden' />
            <Flex justify='center' align='flex-start' vertical gap='small'>
                <video ref={remoteVideoRef} autoPlay playsInline muted className='w-full aspect-video border' />
                <Flex align='flex-start' gap='small' className='w-1/4 justify-self-center self-center'>
                    <video ref={localVideoRef} autoPlay playsInline muted className='w-full aspect-video border justify-self-center self-center' />
                    <Space direction='vertical' size='small'>
                        <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                            <TooltipButton icon={<UploadOutlined />} />
                        </Upload>
                        <TooltipButton title='Clear source' icon={<CloseOutlined />} onClick={handleClearSrc} color='default' variant='outlined' />
                    </Space>
                </Flex>
                <Space direction='horizontal' size='small' className='self-center'>
                    <TooltipButton title='Start Stream' icon={<PlayCircleOutlined />} onClick={streamRoom} className='!bg-green-500 hover:!opacity-75' />
                    {/* <TooltipButton title='Pause Stream' icon={<PauseCircleOutlined />} onClick={() => disconnectStream()} className='!bg-yellow-400 hover:!opacity-75' />
                    <TooltipButton title='Release' icon={<PoweroffOutlined />} color='danger' onClick={() => releaseP2P()} /> */}
                </Space>
            </Flex>
        </AdminPage>
    );
}