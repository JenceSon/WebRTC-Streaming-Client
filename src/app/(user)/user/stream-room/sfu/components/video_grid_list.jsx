'use client';
import { T } from '@/app/common';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Col, List, Row, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import DetailStatsPopover from '../../mesh/components/detail_stats_popover';
import { useVideoContext } from '../[id]/page';

const VideoGridList = () => {
    const { room } = useVideoContext();
    const remoteParticipants = room.remoteParticipants;
    const remoteParticipantsPages = T.lodash.chunk(Array.from(remoteParticipants.values()), 4);
    const [state, setState] = useState({
        current: 1
    });
    return (
        <List
            dataSource={remoteParticipantsPages}
            renderItem={page => <VideoGridPage page={page} />}
            pagination={{
                current: state.current,
                pageSize: 1,
                total: remoteParticipantsPages.length,
                onChange: page => setState({ ...state, current: page }),
                align: 'center',
                position: 'bottom'
            }}
            className='w-full'
        />
    );
};

const VideoGridPage = ({ page }) => {
    const { room } = useVideoContext();
    const remoteParticipants = room.remoteParticipants;
    const length = page.length;

    if (length == 1 && remoteParticipants.size == 1) {
        const id = page[0].identity;
        return <StreamingVideo id={id} />;
    }
    return (
        <Row gutter={[16, 16]}>
            {
                page.map(({ identity: id }) => (
                    <Col key={id} span={12}>
                        <StreamingVideo id={id} />
                    </Col>
                ))
            }
        </Row>
    );
};

const StreamingVideo = ({ id }) => {
    const { remoteVideosRef, remoteStreamsRef, room } = useVideoContext();
    const remoteParticipant = room.remoteParticipants.get(id);

    const [state, setState] = useState({
        reports: { video: {}, audio: {} }
    });
    const getStats = async () => {
        try {
            const stats = await Promise.all(Array.from(remoteParticipant.trackPublications.values()).map(trackPublication => (async () => {
                return Array.from(await trackPublication.track?.getRTCStatsReport().then(map => map.values()) || []);
            })())).then(list => list.flat());
            const reports = T.webRtc.formatStats(stats, 'rcv');
            setState({ ...state, reports });
        } catch (error) {
            console.error(error);
            T.message.error(error);
            setState({ ...state, reports: { video: {}, audio: {} } });
        }
    };

    useEffect(() => {
        const interval = setInterval(() => getStats(), 1000);
        return () => clearInterval(interval);
    }, []);

    const videoRef = e => {
        if (e) {
            if (remoteVideosRef.current[id]) e.srcObject = remoteVideosRef.current[id].srcObject;
            else e.srcObject = remoteStreamsRef.current[id];
            remoteVideosRef.current[id] = e;
        }
    };

    const VideoMemo = useMemo(() => (
        <video ref={videoRef} autoPlay playsInline className='w-full aspect-video border' />
    ), [id]);

    const isHost = JSON.parse(remoteParticipant.metadata)?.role == 'host';
    const { resolution, codec, fps } = state.reports.video;
    const { codec: codecAudio } = state.reports.audio;
    const summary = codec || codecAudio ? ` 🎥: ${resolution} - ${fps}fps - ${codec} 🎧: ${codecAudio}` : '';
    return (
        <div className='!relative w-full !mx-auto'>
            {VideoMemo}
            <DetailStatsPopover username={remoteParticipant.name} video={state.reports.video} audio={state.reports.audio}>
                <Alert
                    message={<Typography.Text ellipsis className='!align-middle !text-[1.0vw]'>{`${remoteParticipant.name}${isHost ? ' (Host)' : ''}${summary}`}</Typography.Text>}
                    type={isHost ? 'info' : 'success'}
                    className='!max-w-[90%] !w-fit !whitespace-nowrap rounded-xl shadow-sm !absolute bottom-0 left-1/2 -translate-x-1/2 !text-[1.0vw] !leading-[2vw] !px-[0.75vw] !py-[0.25vw]'
                    icon={<UserOutlined />}
                    showIcon
                />
            </DetailStatsPopover>
        </div>
    );
};

export default VideoGridList;