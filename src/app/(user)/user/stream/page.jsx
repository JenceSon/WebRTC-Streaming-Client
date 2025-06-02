'use client';

import { T } from '@/app/common';
import { useEffect, useRef } from 'react';
import AdminPage from '../../components/admin_page';
import { DisconnectOutlined, FileOutlined, ReloadOutlined, SendOutlined, SwapOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row, Space, Table, Upload } from 'antd';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { getPageStream } from './redux';
import { TooltipButton } from '@/components/button';
import { useWebRtc } from '@/hooks/web_rtc_hooks';

export default function StreamPage() {
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const hiddenVideoRef = useRef();
    const toSession = useRef();
    const { connectPeer, stream, getPeer, disconnectStream } = useWebRtc();
    const peer = getPeer();

    const list = useAppSelector('stream').list;
    const dispatch = useAppDispatch();

    const getPage = async () => await dispatch(getPageStream());

    useEffect(() => {
        getPage();
        getPeer().ontrack = e => {
            remoteVideoRef.current.srcObject = e.streams[0];
        };
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
                    <TooltipButton title='Request connect' className='!bg-green-500 hover:!opacity-75' icon={<SwapOutlined />} onClick={() => { connectPeer(record.id); toSession.current = record.id; }} />
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
            <Row gutter={16}>
                <Col span={11}>
                    <Flex justify='center' align='center' gap='small' vertical>
                        <video ref={localVideoRef} autoPlay playsInline muted className='border' />
                        <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                            <Button icon={<UploadOutlined />}>Click to Upload</Button>
                        </Upload>
                    </Flex>
                </Col>
                <Col span={2}>
                    <Flex justify='center' align='center' gap='small' vertical className='h-full'>
                        <TooltipButton title='Start Stream' icon={<SendOutlined />} onClick={() => stream(toSession.current)} />
                        <TooltipButton title='Disconnect' icon={<DisconnectOutlined />} color='danger' onClick={() => disconnectStream(toSession.current)} />
                    </Flex>
                </Col>
                <Col span={11}>
                    <video ref={remoteVideoRef} autoPlay playsInline muted className='border self-center justify-self-center' />
                </Col>
            </Row>
            <Flex justify='right'>
                <TooltipButton title='Reload' icon={<ReloadOutlined />} onClick={getPage} />
            </Flex>
            <Table columns={columns} dataSource={list} />
        </AdminPage>
    );
}