'use client';
import * as livekitLib from 'livekit-client';

const config = Object.freeze({
    wsUrl: process.env.NEXT_PUBLIC_WEBSOCKET_LIVEKIT_URL
});

const livekit = {
    ...livekitLib,
    connect: async (token, room, option = {}) => {
        await room.connect(config.wsUrl, token, option);
    },
};
export { livekit };