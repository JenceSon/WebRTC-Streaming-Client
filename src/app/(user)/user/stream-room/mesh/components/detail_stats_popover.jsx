import { T } from '@/app/common';
import { Button, Descriptions, Popover } from 'antd';
import React, { useState } from 'react';

const MAX_VISIBLE = 4;

export default function DetailStatsPopover({ user, video, audio, children }) {
    const convertStats = report => {
        const descriptionItems = [];
        Object.entries(report).forEach(([key, value]) => {
            const label = T.string.toUpperCase(key.replace(/([a-z])([A-Z])/g, '$1 $2'), 'sentence');
            if (typeof value == 'object') {
                if (Array.isArray(value)) value = value.join(', ');
                else {
                    value = Object.entries(value).map(([subKey, subValue]) => {
                        const label = subKey.replace(/([a-z])([A-Z])/g, '$1 $2');
                        return `${label} - ${subValue}`;
                    }).join(', ');
                }
            }
            if (typeof value == 'boolean') value = value ? 'Yes' : 'No';
            descriptionItems.push({ key, label, children: value });
        });
        return descriptionItems;
    };

    const [state, setState] = useState({
        isExpandVideo: false,
        isExpandAudio: false
    });
    const statsVideo = convertStats(video);
    const statsAudio = convertStats(audio);
    const statsDisplayVideo = !state.isExpandVideo ? statsVideo.slice(0, MAX_VISIBLE) : statsVideo;
    const statsDisplayAudio = !state.isExpandAudio ? statsAudio.slice(0, MAX_VISIBLE) : statsAudio;

    const content = (
        <div className='!max-h-[40vh] !max-w-xs !overflow-x-auto overflow-y-auto'>
            <Descriptions title='🎥 Video' items={statsDisplayVideo} column={1} />
            {
                statsVideo.length > MAX_VISIBLE &&
                <Button type='link' onClick={() => setState({ ...state, isExpandVideo: !state.isExpandVideo })}>
                    {!state.isExpandVideo ? '...Show' : 'Hide'}
                </Button>
            }
            <Descriptions title='🎧 Audio' items={statsDisplayAudio} column={1} />
            {
                statsAudio.length > MAX_VISIBLE &&
                <Button type='link' onClick={() => setState({ ...state, isExpandAudio: !state.isExpandAudio })}>
                    {!state.isExpandAudio ? '...Show' : 'Hide'}
                </Button>
            }
        </div>
    );

    return (
        <Popover title={user?.username || ''} content={content} trigger='click'>
            {children}
        </Popover>
    );
}