'use client';

import { useEffect, useState } from 'react';
import { useVideoContext } from '../[id]/page';
import { Col, Divider, Row, Space, Statistic, Typography } from 'antd';
import DetailStatsPopover from '@/app/(user)/user/stream-room/mesh/components/detail_stats_popover';
import { InfoCircleTwoTone } from '@ant-design/icons';
import { T } from '@/app/common';


export default function StreamingStats() {
    const { room } = useVideoContext();
    const { localParticipant, RemoteParticipants } = room;
    const [state, setState] = useState({
        reports: { video: {}, audio: {} }
    });

    const getStats = async () => {
        try {
            const stats = await Promise.all(Array.from(localParticipant.trackPublications.values()).map(trackPublication => (async () => {
                return Array.from(await trackPublication.track.getRTCStatsReport().then(map => map.values()));
            })())).then(list => list.flat());
            const reports = T.webRtc.formatStats(stats, 'snd');
            setState({ ...state, reports });
        } catch (error) {
            console.error(error);
            T.message.error('Error handling get stats of stream!');
            setState({ ...state, reports: { video: {}, audio: {} } });
        }
    };

    useEffect(() => {
        const interval = setInterval(() => getStats(), 1000);
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
                        <DetailStatsPopover username={localParticipant.name} video={state.reports.video} audio={state.reports.audio}>
                            <InfoCircleTwoTone />
                        </DetailStatsPopover>
                    </Space>
                </Col>
            </Row>
            <Divider orientation='left'>Video</Divider>
            <Row gutter={16}>
                <Col span={12}>
                    <Statistic title='Codec' value={codec} loading={!codec} />
                </Col>
                <Col span={12}>
                    <Statistic title='Resolution' value={resolution} loading={!resolution} />
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Statistic title='FPS' value={fps} loading={!fps} />
                </Col>
                <Col span={12}>
                    <Statistic title='Bitrate' value={targetBitrate / 1000} loading={!targetBitrate} suffix='kbps' />
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