'use client';

import { useAppDispatch, useAppSelector } from '@/hooks/redux_hooks';
import { useWebRtcMesh } from '@/hooks/web_rtc_mesh_hooks';
import { deleteRoomSmManageRooms, getRoomSmManageRooms } from '@/app/(user)/user/stream-room/redux';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Col, Divider, Flex, FloatButton, List, Row, Space, Spin, Statistic, Table, Typography, Upload } from 'antd';
import AdminPage from '@/app/(user)/components/admin_page';
import { CloseOutlined, InfoCircleTwoTone, PauseCircleOutlined, PlayCircleOutlined, PoweroffOutlined, TeamOutlined, UploadOutlined, UserOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { T } from '@/app/common';
import { TooltipButton } from '@/components/button';
import ConfirmModal from '@/components/confirm_modal';
import DetailStatsPopover from '../components/detail_stats_popover';

const VideoContext = createContext();
const useVideoContext = () => useContext(VideoContext);
// const Chart = T.Chart;
// const MAX_POINT = 60;

export default function DetailRoomPage({ params }) {
    const roomId = params.id;
    const dispatch = useAppDispatch();
    const getRoom = async () => await dispatch(getRoomSmManageRooms(roomId));
    const room = useAppSelector('streamRoom').room;
    const user = useAppSelector('systemState', 'userReducer').user;
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
    const { getRcvPeers, getSndPeer, connect, disconnect, setDefaultTrack, release, getSndStats, getRcvStats } = webRtcMesh;

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

    const isHost = room.host.id == user?.id;

    const rcvPeers = getRcvPeers();
    Object.keys(remoteVideoRef.current).forEach(id => {
        if (!rcvPeers[id]) delete remoteVideoRef.current[id];
    });

    return (<>
        <AdminPage
            title={<>Room <Typography.Text copyable className='!text-2xl !font-bold !text-primary'>{room.roomId}</Typography.Text></>}
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
            <VideoContext.Provider value={{ remoteVideoRef, rcvPeers, connect, disconnect, remoteStreamRef, release, getSndStats, getRcvStats }}>
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
                                <Alert
                                    message={`${T.string.toUpperCase(user?.username, 'word')} (You)`}
                                    type={isHost ? 'info' : 'success'}
                                    className='w-fit rounded-xl shadow-sm !absolute bottom-0 left-1/2 -translate-x-1/2 !text-[1.0vw] !leading-[2vw] !px-[0.75vw] !py-[0.25vw]'
                                    icon={<UserOutlined />}
                                    showIcon
                                />
                            </div>
                        </Flex>
                    </Col>
                    <Col xs={24} sm={24} md={8}>
                        <Flex vertical gap='small' align='flex-start' justify='center'>
                            <RoomDetail />
                            <StreamingStats />
                        </Flex>
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
    return (
        <Row gutter={[16, 16]}>
            {
                page.map(([id, _]) => (
                    <Col key={id} span={12} className='justify-self-center self-center'>
                        <StreamingVideo id={id} />
                    </Col>
                ))
            }
        </Row>
    );

};

const StreamingVideo = ({ id }) => {
    const { remoteVideoRef, rcvPeers, remoteStreamRef, getRcvStats } = useVideoContext();
    const [state, setState] = useState({
        reports: { video: {}, audio: {} },
        summary: ''
    });
    const getDetailStream = async () => {
        const reports = await getRcvStats(id);
        const { resolution = 'Unknown', codec = 'Unknown', fps = 0 } = reports.video;
        const { codec: codecAudio } = reports.audio;
        let summary = '';
        if (codec && codecAudio) {
            summary = ` 🎥: ${resolution} - ${fps}fps - ${codec} 🎧: ${codecAudio}`;
        }
        setState({ ...state, reports, summary });
    };
    useEffect(() => {
        const interval = setInterval(() => {
            getDetailStream();
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    const room = useAppSelector('streamRoom').room;
    const videoRef = e => {
        if (e) {
            if (remoteVideoRef.current[id]) e.srcObject = remoteVideoRef.current[id].srcObject;
            else e.srcObject = remoteStreamRef.current[id];
            remoteVideoRef.current[id] = e;
        }
    };
    const user = rcvPeers[id];
    const isHost = room.host.id == user.id;
    const VideoMemo = useMemo(() => (
        <video ref={videoRef} autoPlay playsInline className='w-full aspect-video border' />
    ), [id]);

    return (
        <div className='!relative w-full !mx-auto'>
            {VideoMemo}
            <DetailStatsPopover user={user} video={state.reports.video} audio={state.reports.audio}>
                <Alert
                    message={<Typography.Text ellipsis className='!align-middle !text-[1.0vw]'>{`${T.string.toUpperCase(user.username, 'word')}${isHost ? ' (Host)' : ''}${state.summary}`}</Typography.Text>}
                    type={isHost ? 'info' : 'success'}
                    className='!max-w-[90%] !w-fit !whitespace-nowrap rounded-xl shadow-sm !absolute bottom-0 left-1/2 -translate-x-1/2 !text-[1.0vw] !leading-[2vw] !px-[0.75vw] !py-[0.25vw]'
                    icon={<UserOutlined />}
                    showIcon
                />
            </DetailStatsPopover>
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
            <Typography.Title level={4}>Room details</Typography.Title>
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

const StreamingStats = () => {
    const { getSndStats } = useVideoContext();
    const user = useAppSelector('systemState', 'userReducer').user;
    const [state, setState] = useState({
        reports: { video: {}, audio: {} }
    });

    const getDetailStream = async () => {
        const reports = await getSndStats();
        setState({ ...state, reports });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            getDetailStream();
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    const { resolution, codec, fps, targetBitrate } = state.reports.video;
    const { codec: codecAudio, targetBitrate: targetBitrateAudio } = state.reports.audio;
    return (
        <>
            <Row gutter={16}>
                <Col span={24}>
                    <Space direction='horizontal' size='small'>
                        <Typography.Title level={4}>Stream details</Typography.Title>
                        <DetailStatsPopover user={user} video={state.reports.video} audio={state.reports.audio}>
                            <InfoCircleTwoTone />
                        </DetailStatsPopover>
                    </Space>
                </Col>
            </Row>
            <Divider orientation='left'>Video</Divider>
            <Row gutter={16} className='w-full'>
                <Col span={12}>
                    <Statistic title='Codec' value={codec} loading={!codec} />
                </Col>
                <Col span={12}>
                    <Statistic title='Resolution' value={resolution} loading={!resolution} />
                </Col>
            </Row>
            <Row gutter={16} className='w-full'>
                <Col span={12}>
                    <Statistic title='FPS' value={fps} loading={!fps} />
                </Col>
                <Col span={12}>
                    <Statistic title='Bitrate' value={targetBitrate || 0 / 1000} loading={!targetBitrate} suffix='kbps' />
                </Col>
            </Row>
            <Divider orientation='left'>Audio</Divider>
            <Row gutter={16} className='w-full'>
                <Col span={12}>
                    <Statistic title='Codec' value={codecAudio} loading={!codecAudio} />
                </Col>
                <Col span={12}>
                    <Statistic title='Bitrate' value={targetBitrateAudio / 1000} loading={!targetBitrateAudio} suffix='kbps' />
                </Col>
            </Row>
        </>
    );
};
// const BitrateChart = ({ type }) => {
//     const { getSndStats } = useVideoContext();
//     const canvasRef = useRef();
//     const chartRef = useRef();
//     const initChart = () => {
//         if (chartRef.current) return;
//         const ctx = canvasRef.current.getContext('2d');
//         if (!ctx) return;
//         const chart = new Chart(ctx, {
//             type: 'line',
//             data: {
//                 labels: [],
//                 datasets: [{
//                     label: 'Bitrate (kbps)',
//                     data: [],
//                     fill: true,
//                     backgroundColor: 'rgba(54, 162, 235, 0.2)',
//                     borderColor: 'rgba(54, 162, 235, 1)',
//                     tension: 0.3,
//                     pointRadius: 0
//                 }]
//             },
//             options: {
//                 animation: false,
//                 responsive: true,
//                 plugins: {
//                     legend: {
//                         display: false
//                     }
//                 },
//                 scales: {
//                     x: {
//                         title: {
//                             display: true,
//                             text: 'Time'
//                         }
//                     },
//                     y: {
//                         title: {
//                             display: true,
//                             text: 'kbps'
//                         },
//                         beginAtZero: true
//                     }
//                 }
//             }
//         });
//         chartRef.current = chart;
//     };

//     useEffect(() => {
//         initChart();
//         return () => chartRef.current?.destroy();
//     }, []);

//     useEffect(() => {
//         const interval = setInterval(async () => {
//             const report = await getSndStats();
//             const targetBitrate = (report[type].targetBitrate || 0) / 1000;
//             const timestamp = report[type].timestamp ? new Date(report[type].timestamp) : new Date();
//             if (!chartRef.current) return;
//             const chart = chartRef.current;
//             const data = chart.data.datasets[0].data;
//             const labels = chart.data.labels;
//             labels.push(T.dateToText(timestamp, 'HH:mm:ss'));
//             data.push(targetBitrate);
//             if (data.length > MAX_POINT) {
//                 data.shift();
//             }
//             chart.update();
//         }, 1000);
//         return () => clearInterval(interval);
//     }, []);

//     return <canvas ref={canvasRef} className='!w-full h-80' />;
// };