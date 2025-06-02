'use client';
import { useEffect, useRef } from 'react';
import { T } from '@/app/common';
import ConfirmModal from '@/components/confirm_modal';

export const topics = {
    OFFER: 'offer',
    REFRESH_OFFER: 'refresh_offer',
    RENEGOTIATION: 'renegotiation',
    RELEASE_P2P: 'release_p2p',
    ANSWER: 'answer',
    ICE: 'ice',
    EXCHANGE_ICE: 'exchange_ice',
    REQUEST_P2P: 'request_p2p',
    RESPONSE_P2P: 'response_p2p',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ACCEPT: 'accept',
    REJECT: 'reject'
};
const { ANSWER, EXCHANGE_ICE, REQUEST_P2P, RESPONSE_P2P, CONNECT, OFFER, DISCONNECT, ACCEPT, REJECT, RELEASE_P2P } = topics;
const options = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};
export const useWebRtc = ({ socketPath, ontrack }) => {
    const iceCandidates = useRef([]);
    const peerRef = useRef();
    const isSendingIce = useRef(false);
    const toSession = useRef('');
    const setUpPeer = async () => {
        const oldRTCPeer = peerRef.current;
        peerRef.current = new RTCPeerConnection(options);

        peerRef.current.oniceconnectionstatechange = () => {
            console.log('state ice: ', peerRef.current.iceConnectionState);
        };

        peerRef.current.onconnectionstatechange = () => {
            console.log('state conn : ', peerRef.current.connectionState);
        };

        const sendExchangeIce = () => {
            if (!isSendingIce.current) return;
            if (iceCandidates.current.length) T.socket.singleton().send(JSON.stringify({ type: EXCHANGE_ICE, data: iceCandidates.current.shift() }));
            setTimeout(sendExchangeIce, 100);
        };

        peerRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                if (!isSendingIce.current) {
                    isSendingIce.current = true;
                    sendExchangeIce();
                };
                const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
                iceCandidates.current.push({ candidate, sdpMid, sdpMLineIndex });
            }
            else {
                console.log('Gathering ice done', iceCandidates.current.length);
                isSendingIce.current = false;
                iceCandidates.current = [];
            }
        };

        if (ontrack && typeof ontrack == 'function') peerRef.current.ontrack = ontrack;

        peerRef.current.videoTransceiver = peerRef.current.addTransceiver('video', { direction: 'sendrecv' }); //inform that use dis Peer to send/recv => no need to add track 1st
        peerRef.current.audioTransceiver = peerRef.current.addTransceiver('audio', { direction: 'sendrecv' });

        if (!oldRTCPeer || !oldRTCPeer.videoTransceiver.sender.track || !oldRTCPeer.audioTransceiver.sender.track) {
            //create default track for sender
            const video = document.createElement('video');
            video.className = 'hidden';
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.src = '/black-screen.mkv';
            await video.play();
            const stream = video.captureStream();
            const videoTrack = stream.getVideoTracks()[0];
            peerRef.current.videoTransceiver.sender.replaceTrack(videoTrack);
            const audioTrack = stream.getAudioTracks()[0];
            peerRef.current.audioTransceiver.sender.replaceTrack(audioTrack);
        }
        else {
            peerRef.current.videoTransceiver.sender.replaceTrack(oldRTCPeer.videoTransceiver.sender.track);
            peerRef.current.audioTransceiver.sender.replaceTrack(oldRTCPeer.audioTransceiver.sender.track);
        }
    };

    const setupSocket = () => {
        const socket = T.socket.singleton();
        const handleMsg = async msg => {
            try {
                const message = JSON.parse(msg.data);
                const { type, data, error, from, mode = 'kms' } = message;
                if (error) return T.message.error(error);
                if (mode == 'kms') {
                    switch (type) {
                        case ANSWER:
                            await peerRef.current.setRemoteDescription({ type, sdp: data });
                            T.hideLoading();
                            T.message.success('Accept connection');
                            break;
                        case EXCHANGE_ICE:
                            await peerRef.current.addIceCandidate(data);
                            break;
                        case REQUEST_P2P:
                            ConfirmModal({
                                title: 'Calling',
                                onOk: () => socket.send(JSON.stringify({ type: RESPONSE_P2P, to: from, data: ACCEPT })),
                                onCancel: () => socket.send(JSON.stringify({ type: RESPONSE_P2P, to: from, data: REJECT }))
                            });
                            break;
                        case RESPONSE_P2P:
                            if (data == ACCEPT) {
                                const sdpOffer = await peerRef.current.createOffer();
                                await peerRef.current.setLocalDescription(sdpOffer);
                                toSession.current = from;
                                socket.send(JSON.stringify({ type: OFFER, data: sdpOffer.sdp }));
                            }
                            else {
                                T.hideLoading();
                                T.message.error('Reject connection from peer!');
                            }
                            break;
                        case CONNECT:
                            T.message.success('connect successfully');
                            break;
                        case DISCONNECT:
                            T.message.success('Disconnect successfully');
                            break;
                        case RELEASE_P2P:
                            toSession.current = '';
                            peerRef.current.close();
                            await setUpPeer();
                            T.message.success('Release successfully');
                            break;
                        default:
                            T.message.error(`Unknow message from sever: ${type}`);
                            break;
                    }
                }
            } catch (error) {
                console.error(error);
                T.message.error('Error handling message!');
            }
        };
        socket.addEventListener('message', handleMsg);
    };
    useEffect(() => {
        setupSocket();
        setUpPeer();
        return () => T.socket.close(socketPath) || peerRef.current.close();
    }, []);
    const connectPeer = (to) => {
        if (!to) return T.message.error('Unvailable peer!');
        if (toSession.current) return T.message.error('Still connecting to another peer!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: REQUEST_P2P, to })) || T.showLoading();
    };
    const stream = () => {
        if (!toSession.current) return T.message.error('Unvailable peer!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: CONNECT, to: toSession.current }));
    };

    const disconnectStream = () => {
        if (!toSession.current) return T.message.error('Unvailable peer!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: DISCONNECT, to: toSession.current }));
    };

    const releaseP2P = () => {
        if (!toSession.current) return T.message.error('Unvailable peer!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: RELEASE_P2P, to: toSession.current }));
    };

    return {
        getPeer: () => peerRef.current,
        getIceCandidates: () => iceCandidates.current,
        getToSession: () => toSession.current,
        connectPeer, stream, disconnectStream, releaseP2P
    };
};