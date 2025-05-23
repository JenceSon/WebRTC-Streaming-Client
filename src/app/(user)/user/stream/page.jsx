'use client';

import { T } from '@/app/common';
import { useEffect, useRef } from 'react';
import AdminPage from '../../components/admin_page';
import { FileOutlined, ReloadOutlined, SendOutlined, SwapOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Space, Table, Upload } from 'antd';
import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { getPageStream } from './redux';
import { TooltipButton } from '@/components/button';
import { useWebRtc } from '@/hooks/web_rtc_hooks';

export default function StreamPage() {
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const hiddenVideoRef = useRef();
    const webRtc = useWebRtc();
    const { connectPeer, stream, peer } = webRtc;

    const list = useAppSelector('stream').list;
    const dispatch = useAppDispatch();

    const getPage = async () => await dispatch(getPageStream());

    useEffect(() => {
        getPage();
        peer().ontrack = e => {
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
                    <TooltipButton title='Request connect' className='!bg-green-500 hover:!opacity-75' icon={<SwapOutlined />} onClick={() => connectPeer(record.id)} />
                    <TooltipButton title='Start Stream' icon={<SendOutlined />} onClick={() => stream(record.id)} />
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
            stream.getTracks().forEach(track => peer().addTrack(track, stream));
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
            <video ref={localVideoRef} autoPlay playsInline muted className="w-64 border" />
            <video ref={remoteVideoRef} autoPlay playsInline muted className="w-64 border" />
            <video ref={hiddenVideoRef} playsInline muted className='hidden' />
            <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                <Button icon={<UploadOutlined />}>Click to Upload</Button>
            </Upload>
            <TooltipButton title='Reload' icon={<ReloadOutlined />} onClick={getPage} />
            <Table columns={columns} dataSource={list} />
        </AdminPage>
    );
}