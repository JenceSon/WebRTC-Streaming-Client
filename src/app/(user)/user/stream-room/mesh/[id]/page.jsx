'use client';

import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { useWebRtcMesh } from '@/hooks/web_rtc_mesh_hooks';
import { getRoomSmManageRooms } from '@/app/(user)/user/stream-room/redux';
import { createRef, useEffect, useMemo, useRef, useState } from 'react';
import { Col, Flex, FloatButton, List, Row, Space, Spin, Upload } from 'antd';
import AdminPage from '@/app/(user)/components/admin_page';
import { CloseOutlined, DownloadOutlined, PauseCircleOutlined, PlayCircleOutlined, PoweroffOutlined, TeamOutlined, UploadOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { T } from '@/app/common';
import { TooltipButton } from '@/components/button';

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
    const hiddenVideoRef = useRef();
    const webcamRef = useRef();
    const ontrack = (id, e) => {
        remoteVideoRef.current[id].srcObject = e.streams[0];
    };
    const webRtcMesh = useWebRtcMesh({ socketPath: `/signal-room-mesh/${roomId}`, ontrack });
    const { getRcvPeers, getSndPeer, connect, disconnect, setDefaultTrack } = webRtcMesh;

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
            <Flex vertical gap='small' align='flex-start' justify='center'>
                {
                    !!Object.values(rcvPeers).length && <VideoGridList rcvPeers={rcvPeers} remoteVideoRef={remoteVideoRef} />
                }
                <Flex align='flex-start' gap='small' className='w-full' justify='center'>
                    {
                        !Object.values(rcvPeers).length ?
                            <video ref={localVideoRef} autoPlay playsInline className='w-full border aspect-video justify-self-center self-center' />
                            :
                            <video ref={localVideoRef} autoPlay playsInline className='w-1/4 border aspect-video justify-self-center self-center' />
                    }
                    <TooltipButton title='Clear source' icon={<CloseOutlined />} onClick={() => handleClearSrc()} color='default' variant='outlined' />
                </Flex>
                <Space direction='horizontal' size='small' className='self-center'>
                    <TooltipButton title='Start Stream' icon={<PlayCircleOutlined />} onClick={() => connect()} className='!bg-green-500 hover:!opacity-75' />
                    <TooltipButton title='Pause Stream' icon={<PauseCircleOutlined />} onClick={() => disconnect()} className='!bg-yellow-400 hover:!opacity-75' />
                </Space>
            </Flex>
            <FloatButton.Group>
                <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                    <FloatButton icon={<UploadOutlined />} tooltip='Upload video' />
                </Upload>
                <FloatButton tooltip='Using webcam' icon={<VideoCameraAddOutlined />} onClick={handleUsingWebcam} />
            </FloatButton.Group>
        </AdminPage>
    );
}

const VideoGridList = ({ rcvPeers, remoteVideoRef }) => {
    const rcvPeersPages = T.lodash.chunk(Object.entries(rcvPeers), 4);
    const [state, setState] = useState({
        current: 1
    });
    return (
        <List
            dataSource={rcvPeersPages}
            renderItem={page => <VideoGridPage page={page} remoteVideoRef={remoteVideoRef} />}
            pagination={{
                current: state.current,
                pageSize: 1,
                total: rcvPeersPages.length,
                onChange: page => setState({ ...state, current: page })
            }}
            className='w-full'
        />
    );
};

const VideoGridPage = ({ page, remoteVideoRef }) => {
    const length = page.length;

    const setVideoRef = (id) => e => {
        if (e) {
            if (remoteVideoRef.current[id]) {
                e.srcObject = remoteVideoRef.current[id].srcObject;
            }
            remoteVideoRef.current[id] = e;
        }
    };

    if (length == 1) {
        const id = page[0][0];
        return (
            <video ref={setVideoRef(id)} autoPlay playsInline className='w-full aspect-video border' />
        );
    }
    const rows = T.lodash.chunk(page, 2);
    return rows.map((row, index) => (
        <Row gutter={16} key={index}>
            {
                row.map(([id, _]) => (
                    <Col key={id} span={12} className='justify-self-center self-center'>
                        <video ref={setVideoRef(id)} autoPlay playsInline className='w-full aspect-video border' />
                    </Col>
                ))
            }
        </Row>
    ));
};

const StreamingVideo = ({ ref }) => {
    const Video = useMemo(() => (
        <video ref={ref} autoPlay playsInline className='w-full aspect-video border' />
    ), [ref]);

    return Video;
};