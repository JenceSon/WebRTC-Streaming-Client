'use client';

import { T } from '@/app/common';
import { useEffect, useRef } from 'react';
import AdminPage from '../../components/admin_page';
import { FileOutlined, PauseCircleOutlined, PlayCircleOutlined, PoweroffOutlined, ReloadOutlined, UploadOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { Flex, Space, Table, Upload } from 'antd';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { getPageStream } from './redux';
import { TooltipButton } from '@/components/button';
import { useWebRtc } from '@/hooks/web_rtc_hooks';

export default function StreamPage() {
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const hiddenVideoRef = useRef();
    const ontrack = e => {
        remoteVideoRef.current.srcObject = e.streams[0];
    };
    const { connectPeer, stream, getPeer, disconnectStream, releaseP2P } = useWebRtc({ ontrack });

    const list = useAppSelector('stream').list;
    const dispatch = useAppDispatch();

    const getPage = async () => await dispatch(getPageStream());

    useEffect(() => {
        getPage();
    }, []);

    const columns = [
        {
            title: 'id',
            dataIndex: 'id',
            key: 'id',
            width: '50%'
        },
        {
            title: 'Action',
            render: (_, record) => (
                <Space size='small'>
                    <TooltipButton title='Request connect' className='!bg-green-500 hover:!opacity-75' icon={<VideoCameraAddOutlined />} onClick={() => connectPeer(record.id)} />
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

    return (
        <AdminPage
            title='Streaming Test'
            icon={<FileOutlined />}
            breadcrumbItems={[
                {
                    title: 'stream'
                }
            ]}
        >
            <video ref={hiddenVideoRef} playsInline muted className='hidden' />
            <Flex justify='center' align='flex-start' vertical gap='small'>
                <video ref={remoteVideoRef} autoPlay playsInline muted className='w-full aspect-video border' />
                <video ref={localVideoRef} autoPlay playsInline muted className='w-1/4 aspect-video border justify-self-center self-center' />
                <Space direction='horizontal' size='small' className='self-center'>
                    <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                        <TooltipButton icon={<UploadOutlined />} type='primary' />
                    </Upload>
                    <TooltipButton title='Start Stream' icon={<PlayCircleOutlined />} onClick={() => stream()} className='!bg-green-500 hover:!opacity-75' />
                    <TooltipButton title='Pause Stream' icon={<PauseCircleOutlined />} onClick={() => disconnectStream()} className='!bg-yellow-400 hover:!opacity-75' />
                    <TooltipButton title='Release' icon={<PoweroffOutlined />} color='danger' onClick={() => releaseP2P()} />
                </Space>
            </Flex>
            <Flex justify='right'>
                <TooltipButton title='Reload' icon={<ReloadOutlined />} onClick={getPage} />
            </Flex>
            <Table columns={columns} dataSource={list} />
        </AdminPage>
    );
}