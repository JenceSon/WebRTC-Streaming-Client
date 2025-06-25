'use client';

import { Flex, Space } from 'antd';
import { useVideoContext } from '../[id]/page';
import { TooltipButton } from '@/components/button';
import { CloudUploadOutlined, PauseCircleOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { T } from '@/app/common';

export default function StreamControls() {
    const { hiddenVideoRef, room, localVideoRef } = useVideoContext();
    const localParticipant = room.localParticipant;
    const [state, setState] = useState({
        paused: true
    });

    const handleResume = async () => {
        try {
            if (hiddenVideoRef.current.src) {
                await hiddenVideoRef.current.play();
                setState({ ...state, paused: false });
            }
        } catch (error) {
            console.error(error);
            T.message.error(error);
        }
    };

    const handlePause = () => {
        if (hiddenVideoRef.current.src) {
            hiddenVideoRef.current.pause();
            setState({ ...state, paused: true });
        }
    };

    const handlePublish = async () => {
        try {
            if (!localVideoRef.current.srcObject) return T.message.warning('Please upload stream before publishing!');
            if (localParticipant.trackPublications.size > 0) return T.message.info('Stream has been published');
            await Promise.all([localVideoRef.current.srcObject.getTracks().map(track => localParticipant.publishTrack(track))]);
            T.message.success('Publish stream successfully');
        } catch (error) {
            console.error(error);
            T.message.error(error);
        }
    };

    return (
        <Flex justify='center' gap='small' className='!w-full'>
            {
                state.paused ?
                    <TooltipButton title='Resume' icon={<PlayCircleOutlined />} color='default' variant='outlined' onClick={handleResume} /> :
                    <TooltipButton title='Pause' icon={<PauseCircleOutlined />} color='default' variant='outlined' onClick={handlePause} />
            }
            <TooltipButton title='Publish' icon={<CloudUploadOutlined />} type='primary' onClick={handlePublish} />
        </Flex>
    );
}