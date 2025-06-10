'use client';

import { T } from '@/app/common';
import { useEffect, useRef, useState } from 'react';
import AdminPage from '@/app/(user)/components/admin_page';
import { CloseOutlined, FileOutlined, PauseCircleOutlined, PhoneOutlined, PlayCircleOutlined, PoweroffOutlined, ReloadOutlined, StopOutlined, UploadOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { Alert, Col, Flex, FloatButton, Row, Space, Table, Typography, Upload } from 'antd';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { getPageStream } from './redux';
import { TooltipButton } from '@/components/button';
import { useWebRtc } from '@/hooks/web_rtc_hooks';

export default function StreamPage() {
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const hiddenVideoRef = useRef();
    const webcamRef = useRef();
    const ontrack = e => {
        remoteVideoRef.current.srcObject = e.streams[0];
    };
    const { connectPeer, stream, getPeer, disconnectStream, releaseP2P, getCallingUser, setDefaultTrack } = useWebRtc({ ontrack });

    const list = useAppSelector('stream').list;
    const dispatch = useAppDispatch();

    const getPage = async () => await dispatch(getPageStream());

    useEffect(() => {
        getPage();
    }, []);

    const columns = [
        {
            title: 'User',
            dataIndex: 'username',
            key: 'username',
            width: '75%'
        },
        {
            title: 'Action',
            width: '25%',
            render: (_, record) => (
                <Space size='small'>
                    <TooltipButton title='Request connect' className='!bg-green-500 hover:!opacity-75' icon={<PhoneOutlined />} onClick={() => connectPeer(record.sessionId)} />
                </Space>
            )
        }
    ];
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

    const handleClearSrc = async () => {
        try {
            hiddenVideoRef.current.pause();
            hiddenVideoRef.current.removeAttribute('src');
            hiddenVideoRef.current.load();
            webcamRef.current?.getTracks().forEach(track => track.stop() || webcamRef.current.removeTrack(track));
            webcamRef.current = undefined;
            localVideoRef.current.removeAttribute('srcObject');
            localVideoRef.current.load();
            await setDefaultTrack();
        } catch (error) {
            T.message.error(error);
        }
    };

    const handleUsingWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            webcamRef.current = stream;
            localVideoRef.current.srcObject = stream;
            const peer = getPeer();
            const videoTrack = stream.getVideoTracks()[0];
            peer.videoTransceiver.sender.replaceTrack(videoTrack);
            const audioTrack = stream.getAudioTracks()[0];
            peer.audioTransceiver.sender.replaceTrack(audioTrack);
        } catch (error) {
            T.message.error(error);
        }
    };

    return (
        <AdminPage
            title='Stream P2P'
            icon={<PhoneOutlined />}
            breadcrumbItems={[
                {
                    title: 'stream'
                },
                {
                    title: 'P2P'
                }
            ]}
        >
            <video ref={hiddenVideoRef} playsInline muted className='hidden' />
            <Row gutter={16}>
                <Col span={16}>
                    <Space direction='vertical' size='small' className='w-full'>
                        {getCallingUser() ?
                            <Alert
                                message={`📞 Calling to ${getCallingUser()}`}
                                type='info'
                                className='w-fit rounded-xl shadow-sm justify-self-center'
                            />
                            :
                            <Alert
                                message={`🕓 Haven't made a call yet`}
                                type='warning'
                                className='w-fit rounded-xl shadow-sm justify-self-center'
                            />
                        }
                        <Flex justify='center' align='flex-start' vertical gap='small'>
                            <video ref={remoteVideoRef} autoPlay playsInline muted className='w-full aspect-video border' />
                            <Flex align='flex-start' gap='small' className='w-1/4 justify-self-center self-center'>
                                <video ref={localVideoRef} autoPlay playsInline muted className='w-full aspect-video border justify-self-center self-center' />
                                <Space direction='vertical' size='small'>
                                    <TooltipButton title='Clear source' icon={<CloseOutlined />} onClick={handleClearSrc} color='default' variant='outlined' />
                                </Space>
                            </Flex>
                            <Space direction='horizontal' size='small' className='self-center'>
                                <TooltipButton title='Start Stream' icon={<PlayCircleOutlined />} onClick={() => stream()} className='!bg-green-500 hover:!opacity-75' />
                                <TooltipButton title='Pause Stream' icon={<PauseCircleOutlined />} onClick={() => disconnectStream()} className='!bg-yellow-400 hover:!opacity-75' />
                                <TooltipButton title='Release' icon={<PoweroffOutlined />} color='danger' onClick={() => releaseP2P()} />
                            </Space>
                        </Flex>
                    </Space>
                </Col>
                <Col span={8}>
                    <Flex justify='right'>
                        <TooltipButton title='Reload' icon={<ReloadOutlined />} onClick={getPage} />
                    </Flex>
                    <Table columns={columns} dataSource={list} rowKey='id' />
                </Col>
            </Row>
            <FloatButton.Group>
                <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                    <FloatButton icon={<UploadOutlined />} tooltip='Upload video' />
                </Upload>
                <FloatButton tooltip='Using webcam' icon={<VideoCameraAddOutlined />} onClick={handleUsingWebcam} />
            </FloatButton.Group>
        </AdminPage>
    );
}