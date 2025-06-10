'use client';

import { useEffect, useRef, useState } from 'react';
import { topics } from './web_rtc_hooks';
import { T } from '@/app/common';

export const meshTopics = {
    NEW_PARTICIPANT: 'new_participant',
    LEAVED_PARTICIPANT: 'leaved_participant',
    RELEASE_ROOM: 'release_room',
    JOIN_ROOM: 'join_room'
};
const { NEW_PARTICIPANT, LEAVED_PARTICIPANT, RELEASE_ROOM, JOIN_ROOM } = meshTopics;
const { ANSWER, EXCHANGE_ICE, CONNECT, DISCONNECT, OFFER } = topics;
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
            if (sndIceCandidates.current.length) T.socket.singleton(socketPath).send(JSON.stringify({ type: EXCHANGE_ICE, data: sndIceCandidates.current.shift(), epOwnerId: '' }));
            if (!sndIceCandidates.current.length && !isSendingIceSnd.current) return console.log('Exchange ice done');
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
                console.log('Gathering ice done', sndIceCandidates.current.length);
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
            if (rcvIceCandidates.current[id].length) T.socket.singleton(socketPath).send(JSON.stringify({ type: EXCHANGE_ICE, data: rcvIceCandidates.current[id].shift(), epOwnerId: id }));
            if (!rcvIceCandidates.current[id].length && !isSendingIceRcv.current[id]) return console.log('Exchange ice done');
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
                console.log('Gathering ice done', rcvIceCandidates.current[id].length);
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
        const handleMsg = async msg => {
            const message = JSON.parse(msg.data);
            try {
                const { type, data, error, mode = 'kms', epOwnerId, idParticipants } = message;
                if (error) return T.hideLoading() || T.message.error(error);
                if (mode == 'kms') {
                    switch (type) {
                        case ANSWER:
                            if (rcvPeersRef.current[epOwnerId]) await rcvPeersRef.current[epOwnerId].setRemoteDescription({ type, sdp: data });
                            else await sndPeerRef.current.setRemoteDescription({ type, sdp: data });
                            break;
                        case EXCHANGE_ICE:
                            await rcvPeersRef.current[epOwnerId]?.addIceCandidate(data);
                            break;
                        case NEW_PARTICIPANT:
                            const { id, newRcvPeer } = setUpNewRcvPeer(data);
                            const sdpOffer = await newRcvPeer.createOffer();
                            await newRcvPeer.setLocalDescription(sdpOffer);
                            socket.send(JSON.stringify({ type: OFFER, data: sdpOffer.sdp, epOwnerId: id }));
                            setState(prev => ({ ...prev, rcvPeers: { ...prev.rcvPeers, [id]: true } }));
                            break;
                        case LEAVED_PARTICIPANT:
                            rcvPeersRef.current[data]?.close();
                            delete rcvPeersRef.current[data];
                            setState(prev => ({ ...prev, rcvPeers: T.lodash.pickBy({ ...prev.rcvPeers, [data]: undefined }) }));
                            break;
                        case JOIN_ROOM:
                            const newRcvPeers = await Promise.all(idParticipants.map(id => (async () => {
                                const { newRcvPeer } = setUpNewRcvPeer(id);
                                const sdpOffer = await newRcvPeer.createOffer();
                                await newRcvPeer.setLocalDescription(sdpOffer);
                                socket.send(JSON.stringify({ type: OFFER, data: sdpOffer.sdp, epOwnerId: id }));
                                return { [id]: true };
                            })()));
                            setState(prev => ({ ...prev, rcvPeers: T.lodash.assign(prev.rcvPeers, ...newRcvPeers) }));
                            break;
                        case CONNECT:
                            T.message.info('Stream has been started');
                            break;
                        case DISCONNECT:
                            T.message.info('Stream has been paused');
                            break;
                        default:
                            T.message.error(`Unknown message from sever: ${type}`);
                            break;
                    }
                }
            } catch (error) {
                console.error(`Error ${error} in ${message}`);
                T.hideLoading();
                T.message.error('Error handling message!');
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
        defaultVideoRef.current.pause();
        defaultVideoRef.current.removeAttribute('src');
    };
    const setDefaultTrack = async () => {
        const video = defaultVideoRef.current ?? document.createElement('video');
        defaultVideoRef.current = video;
        video.id = 'default-track';
        video.className = 'hidden';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.src = '/black-screen.mkv';
        await video.play();
        const stream = video.captureStream();
        const videoTrack = stream.getVideoTracks()[0];
        sndPeerRef.current.videoTransceiver.sender.replaceTrack(videoTrack);
        const audioTrack = stream.getAudioTracks()[0];
        sndPeerRef.current.audioTransceiver.sender.replaceTrack(audioTrack);
    };
    const connect = async () => {
        const socket = T.socket.singleton(socketPath);
        if (!sndPeerRef.current.localDescription) {
            const sdpOffer = await sndPeerRef.current.createOffer();
            await sndPeerRef.current.setLocalDescription(sdpOffer);
            socket.send(JSON.stringify({ type: OFFER, data: sdpOffer.sdp, epOwnerId: '' }));
        }
        socket.send(JSON.stringify({ type: CONNECT }));
    };


    const disconnect = () => T.socket.singleton(socketPath).send(JSON.stringify({ type: DISCONNECT }));

    return {
        getSndPeer: () => sndPeerRef.current,
        getRcvPeers: () => state.rcvPeers,
        getRcvPeer: (id) => state.rcvPeers[id],
        connect, disconnect, setDefaultTrack,
    };
};