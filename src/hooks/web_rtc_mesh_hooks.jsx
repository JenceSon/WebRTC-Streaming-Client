'use client';

import { useEffect, useRef, useState } from 'react';
import { topics } from './web_rtc_hooks';
import { T } from '@/app/common';
import { useAppSelector } from './redux_hooks';
import { useAppRouter } from './router_hook';

export const meshTopics = {
    NEW_PARTICIPANT: 'new_participant',
    LEFT_PARTICIPANT: 'left_participant',
    RELEASE_ROOM: 'release_room',
    JOIN_ROOM: 'join_room'
};
export const meshConst = {
    SND_EP: 'snd_ep',
    RCV_EP: 'rcv_ep'
};
const { NEW_PARTICIPANT, LEFT_PARTICIPANT, RELEASE_ROOM, JOIN_ROOM } = meshTopics;
const { ANSWER, EXCHANGE_ICE, CONNECT, DISCONNECT, OFFER } = topics;
const { SND_EP, RCV_EP } = meshConst;
const options = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export const useWebRtcMesh = ({ socketPath, ontrack }) => {
    const rcvIceCandidates = useRef({});
    const isSendingIceRcv = useRef({});
    const rcvPeersRef = useRef({});
    const sndIceCandidates = useRef([]);
    const isSendingIceSnd = useRef(false);
    const sndPeerRef = useRef();
    const defaultVideoRef = useRef();
    const router = useAppRouter();
    const user = useAppSelector('systemState', 'userReducer').user;
    const [state, setState] = useState({
        rcvPeers: {}
    });

    const setUpSndPeer = async () => {
        const sndPeer = new RTCPeerConnection(options);

        sndPeer.oniceconnectionstatechange = () => {
            console.log('state ice snd: ', sndPeer.iceConnectionState);
        };

        sndPeer.onconnectionstatechange = () => {
            console.log('state conn snd: ', sndPeer.connectionState);
        };

        const sendExchangeIce = () => {
            if (sndIceCandidates.current.length) T.socket.singleton(socketPath).send(JSON.stringify({ type: EXCHANGE_ICE, candidate: sndIceCandidates.current.shift(), iceExchangerId: '', epType: SND_EP }));
            if (!sndIceCandidates.current.length && !isSendingIceSnd.current) return console.log('Exchange ice for sndPeer done');
            setTimeout(sendExchangeIce, 100);
        };

        sndPeer.onicecandidate = (event) => {
            if (event.candidate) {
                const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
                sndIceCandidates.current.push({ candidate, sdpMid, sdpMLineIndex });
                if (!isSendingIceSnd.current) {
                    isSendingIceSnd.current = true;
                    sendExchangeIce();
                };
            }
            else {
                console.log('Gathering ice for sndPeer done');
                isSendingIceSnd.current = false;
            }
        };

        if (ontrack && typeof ontrack == 'function') sndPeer.ontrack = ontrack;

        sndPeer.videoTransceiver = sndPeer.addTransceiver('video', { direction: 'sendonly' });
        sndPeer.audioTransceiver = sndPeer.addTransceiver('audio', { direction: 'sendonly' });

        sndPeerRef.current = sndPeer;
        await setDefaultTrack();

        return { sndPeer };
    };

    const setUpNewRcvPeer = (id) => {
        if (!id) return;
        const newRcvPeer = new RTCPeerConnection(options);
        rcvIceCandidates.current[id] = [];
        isSendingIceRcv.current[id] = false;

        newRcvPeer.oniceconnectionstatechange = () => {
            console.log(`state ice of rcv ${id}: ${newRcvPeer.iceConnectionState}`);
        };

        newRcvPeer.onconnectionstatechange = () => {
            console.log(`state conn of rcv ${id}: ${newRcvPeer.connectionState}`);
        };

        const sendExchangeIce = () => {
            if (rcvIceCandidates.current[id].length) T.socket.singleton(socketPath).send(JSON.stringify({ type: EXCHANGE_ICE, candidate: rcvIceCandidates.current[id].shift(), iceExchangerId: id, epType: RCV_EP }));
            if (!rcvIceCandidates.current[id].length && !isSendingIceRcv.current[id]) return console.log(`Exchange ice for ${id} done`);
            setTimeout(sendExchangeIce, 100);
        };

        newRcvPeer.onicecandidate = (event) => {
            if (event.candidate) {
                const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
                rcvIceCandidates.current[id].push({ candidate, sdpMid, sdpMLineIndex });
                if (!isSendingIceRcv.current[id]) {
                    isSendingIceRcv.current[id] = true;
                    sendExchangeIce();
                };
            }
            else {
                console.log(`Gathering ice for ${id} done`);
                isSendingIceRcv.current[id] = false;
            }
        };

        if (ontrack && typeof ontrack == 'function') newRcvPeer.ontrack = (e) => ontrack(id, e);

        newRcvPeer.videoTransceiver = newRcvPeer.addTransceiver('video', { direction: 'recvonly' });
        newRcvPeer.audioTransceiver = newRcvPeer.addTransceiver('audio', { direction: 'recvonly' });

        rcvPeersRef.current[id] = newRcvPeer;

        return { newRcvPeer, id };
    };

    const setUpSocket = () => {
        const socket = T.socket.singleton(socketPath);
        const handleTopic = {
            [ANSWER]: async message => {
                const { type, sdpAnswer: sdp, answerRcverId, epType } = message;
                if (epType == SND_EP) await sndPeerRef.current.setRemoteDescription({ type, sdp });
                else await rcvPeersRef.current[answerRcverId].setRemoteDescription({ type, sdp });
            },
            [EXCHANGE_ICE]: async message => {
                const { candidate, iceExchangerId, epType } = message;
                if (epType == SND_EP) await sndPeerRef.current.addIceCandidate(candidate);
                else await rcvPeersRef.current[iceExchangerId].addIceCandidate(candidate);
            },
            [NEW_PARTICIPANT]: async message => {
                const { sessionId, user } = message;
                const { id, newRcvPeer } = setUpNewRcvPeer(sessionId);
                const sdpOffer = await newRcvPeer.createOffer();
                await newRcvPeer.setLocalDescription(sdpOffer);
                socket.send(JSON.stringify({ type: OFFER, sdpOffer: sdpOffer.sdp, offerSnderId: id, epType: RCV_EP }));
                T.message.info(`${T.string.toUpperCase(user.username, 'word')} has joined in room`);
                setState(prev => ({ ...prev, rcvPeers: { ...prev.rcvPeers, [id]: user } }));
            },
            [LEFT_PARTICIPANT]: async message => {
                const { sessionId, user } = message;
                rcvPeersRef.current[sessionId].close();
                delete rcvPeersRef.current[sessionId];
                T.message.info(`${T.string.toUpperCase(user.username, 'word')} has left`);
                setState(prev => ({ ...prev, rcvPeers: T.lodash.pickBy({ ...prev.rcvPeers, [sessionId]: undefined }) }));
            },
            [JOIN_ROOM]: async message => {
                const { participants } = message;
                const newRcvPeers = await Promise.all(Object.entries(participants).map(([sessionId, user]) => (async () => {
                    const { id, newRcvPeer } = setUpNewRcvPeer(sessionId);
                    const sdpOffer = await newRcvPeer.createOffer();
                    await newRcvPeer.setLocalDescription(sdpOffer);
                    socket.send(JSON.stringify({ type: OFFER, sdpOffer: sdpOffer.sdp, offerSnderId: id, epType: RCV_EP }));
                    return { [id]: user };
                })()));
                setState(prev => ({ ...prev, rcvPeers: T.lodash.assign(prev.rcvPeers, ...newRcvPeers) }));
            },
            [CONNECT]: message => {
                const { srcUser } = message;
                if (user?.id == srcUser.id) T.message.success('Start stream successfully');
                else T.message.info(`${T.string.toUpperCase(srcUser.username, 'word')} has started streaming`);
            },
            [DISCONNECT]: message => {
                const { srcUser } = message;
                if (user?.id == srcUser.id) T.message.success('Stop stream successfully');
                else T.message.info(`${T.string.toUpperCase(srcUser.username, 'word')} has stopped streaming`);
            },
            [RELEASE_ROOM]: message => {
                T.message.info('Room has been released by host');
                router.push('/user/stream-room');
            }
        };
        const handleMsg = async msg => {
            const message = JSON.parse(msg.data);
            const { type, error } = message;
            try {
                if (error) return T.hideLoading() || T.message.error(error);
                handleTopic[type] ? await handleTopic[type](message) : T.message.error(`Unknown message from sever: ${type}`);
            } catch (error) {
                console.error(`Error ${error} in ${message}`);
                T.hideLoading();
                T.message.error(`Error handling message ${type}!`);
            }
        };
        socket.addEventListener('message', handleMsg);
    };

    const setUp = async () => {
        await setUpSndPeer();
        setUpSocket();
    };

    useEffect(() => {
        setUp();
        return () => handleUnmount();
    }, []);

    const handleUnmount = () => {
        T.socket.close(socketPath);
        sndPeerRef.current.close();
        Object.values(rcvPeersRef.current).forEach(rcvPeer => rcvPeer.close());
        defaultVideoRef.current?.pause();
        defaultVideoRef.current?.removeAttribute('src');
    };
    const setDefaultTrack = async () => {
        const video = defaultVideoRef.current ?? document.createElement('video');
        defaultVideoRef.current = video;
        video.id = 'default-track';
        video.className = 'hidden';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.src = '/white_screen.mkv';
        await video.play();
        const stream = video.captureStream();
        const videoTrack = stream.getVideoTracks()[0];
        sndPeerRef.current.videoTransceiver.sender.replaceTrack(videoTrack);
        const audioTrack = stream.getAudioTracks()[0];
        sndPeerRef.current.audioTransceiver.sender.replaceTrack(audioTrack);
    };
    const connect = async (...connectIds) => {
        if (connectIds.length == 0) return T.message.warning('Haven\'t select sink connection yet!');
        const socket = T.socket.singleton(socketPath);
        if (!sndPeerRef.current.localDescription) {
            const sdpOffer = await sndPeerRef.current.createOffer();
            await sndPeerRef.current.setLocalDescription(sdpOffer);
            socket.send(JSON.stringify({ type: OFFER, sdpOffer: sdpOffer.sdp, offerSnderId: '', epType: SND_EP }));
        }
        socket.send(JSON.stringify({ type: CONNECT, connectIds }));
    };


    const disconnect = (...disconnectIds) => {
        if (disconnectIds.length == 0) return T.message.warning('Haven\'t select sink connection yet!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: DISCONNECT, disconnectIds }));
    };

    const release = () => T.socket.singleton(socketPath).send(JSON.stringify({ type: RELEASE_ROOM }));

    const getSndStats = async () => {
        try {
            const stats = await sndPeerRef.current?.getStats();
            const reports = { video: {}, audio: {} };
            stats?.forEach(report => {
                if (report.type == 'codec') {
                    const { mimeType, ...rest } = report;
                    const [kind, codec] = mimeType.split('/');
                    if (reports[kind]) {
                        reports[kind] = T.lodash.merge(reports[kind], { codec, ...rest });
                    }
                }
                if (report.type == 'outbound-rtp') {
                    const kind = report.kind;
                    if (kind == 'video') {
                        const { frameWidth, frameHeight, framesPerSecond, ...rest } = report;
                        const resolution = `${frameWidth}x${frameHeight}`;
                        const fps = framesPerSecond;
                        reports.video = T.lodash.merge(reports.video, { resolution, fps, ...rest });
                    }
                    if (kind == 'audio') {
                        reports.audio = T.lodash.merge(reports.audio, report);
                    }
                }
            });
            return reports;
        } catch (error) {
            console.error(error);
            T.message.error('Error handling get stats of stream!');
            return { video: {}, audio: {} };
        }
    };

    const getRcvStats = async id => {
        const reports = { video: {}, audio: {} };
        try {
            const rcvPeer = rcvPeersRef.current[id];
            const stats = await rcvPeer?.getStats();
            stats.forEach(report => {
                if (report.type == 'codec') {
                    const { mimeType, ...rest } = report;
                    const [kind, codec] = mimeType.split('/');
                    if (reports[kind]) {
                        reports[kind] = T.lodash.merge(reports[kind], { codec, ...rest });
                    }
                }
                if (report.type == 'inbound-rtp') {
                    const kind = report.kind;
                    if (kind == 'video') {
                        const { frameWidth, frameHeight, framesPerSecond, ...rest } = report;
                        const resolution = `${frameWidth}x${frameHeight}`;
                        const fps = framesPerSecond;
                        reports.video = T.lodash.merge(reports.video, { resolution, fps, ...rest });
                    }
                    if (kind == 'audio') {
                        reports.audio = T.lodash.merge(reports.audio, report);
                    }
                }
            });
            return reports;
        } catch (error) {
            console.error(error);
            T.message.error('Error handling get stats of participant\'s stream!');
            return reports;
        }
    };

    return {
        getSndPeer: () => sndPeerRef.current,
        getRcvPeers: () => state.rcvPeers,
        getRcvPeer: (id) => state.rcvPeers[id],
        connect, disconnect, setDefaultTrack, release, getSndStats, getRcvStats
    };
};