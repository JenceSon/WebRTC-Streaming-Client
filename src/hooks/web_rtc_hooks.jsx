'use client';
import { useEffect, useRef, useState } from 'react';
import { T } from '@/app/common';
import ConfirmModal from '@/components/confirm_modal';
import { CloseOutlined, PoweroffOutlined } from '@ant-design/icons';

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
export const useWebRtc = ({ socketPath = '/signal', ontrack }) => {
    const iceCandidates = useRef([]);
    const peerRef = useRef();
    const isSendingIce = useRef(false);
    const toSession = useRef('');
    const [state, setState] = useState({
        callingUser: undefined
    });
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
            if (iceCandidates.current.length) T.socket.singleton(socketPath).send(JSON.stringify({ type: EXCHANGE_ICE, data: iceCandidates.current.shift() }));
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
            await setDefaultTrack();
        }
        else {
            peerRef.current.videoTransceiver.sender.replaceTrack(oldRTCPeer.videoTransceiver.sender.track);
            peerRef.current.audioTransceiver.sender.replaceTrack(oldRTCPeer.audioTransceiver.sender.track);
        }
    };

    const setupSocket = () => {
        const socket = T.socket.singleton(socketPath);
        const handleMsg = async msg => {
            try {
                const message = JSON.parse(msg.data);
                const { type, data, error, from, mode = 'kms', username } = message;
                if (error) return T.hideLoading() || T.message.error(error);
                if (mode == 'kms') {
                    switch (type) {
                        case ANSWER:
                            await peerRef.current.setRemoteDescription({ type, sdp: data });
                            T.hideLoading();
                            T.message.success('Accept calling');
                            break;
                        case EXCHANGE_ICE:
                            await peerRef.current.addIceCandidate(data);
                            break;
                        case REQUEST_P2P:
                            ConfirmModal({
                                title: `Calling from ${username}`,
                                onOk: () => socket.send(JSON.stringify({ type: RESPONSE_P2P, to: from, data: ACCEPT })),
                                onCancel: () => socket.send(JSON.stringify({ type: RESPONSE_P2P, to: from, data: REJECT }))
                            });
                            break;
                        case RESPONSE_P2P:
                            if (data == ACCEPT) {
                                const sdpOffer = await peerRef.current.createOffer();
                                await peerRef.current.setLocalDescription(sdpOffer);
                                toSession.current = from;
                                setState({ ...state, callingUser: username });
                                socket.send(JSON.stringify({ type: OFFER, data: sdpOffer.sdp }));
                            }
                            else {
                                T.hideLoading();
                                T.message.error(`Rejected!`);
                            }
                            break;
                        case CONNECT:
                            T.message.info('Stream has been started');
                            break;
                        case DISCONNECT:
                            T.message.info('Stream has been paused');
                            break;
                        case RELEASE_P2P:
                            toSession.current = '';
                            setState({ ...state, callingUser: undefined });
                            peerRef.current.close();
                            await setUpPeer();
                            T.message.info('The connection has been released!');
                            break;
                        default:
                            T.message.error(`Unknow message from sever: ${type}`);
                            break;
                    }
                }
            } catch (error) {
                console.error(error);
                T.hideLoading();
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
        if (!to) return T.message.error('Unvailable user!');
        if (toSession.current) return T.message.error('Still calling to another user!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: REQUEST_P2P, to })) || T.showLoading();
    };
    const stream = () => {
        if (!toSession.current) return T.message.error('Unvailable user!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: CONNECT, to: toSession.current }));
    };

    const streamRoom = async () => {
        const sdpOffer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(sdpOffer);
        T.socket.singleton(socketPath).send(JSON.stringify({ type: OFFER, data: sdpOffer.sdp }));
    };

    const disconnectStream = () => {
        if (!toSession.current) return T.message.error('Unvailable user!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: DISCONNECT, to: toSession.current }));
    };

    const releaseP2P = () => ConfirmModal({
        title: 'Confirm release this call?',
        okText: 'Confirm',
        cancelText: 'Cancel',
        okButtonProps: { icon: <PoweroffOutlined />, color: 'danger', variant: 'solid' },
        cancelButtonProps: { icon: <CloseOutlined /> },
        onOk: () => {
            if (!toSession.current) return T.message.error('Unvailable user!');
            T.socket.singleton(socketPath).send(JSON.stringify({ type: RELEASE_P2P, to: toSession.current }));
        }
    });

    const setDefaultTrack = async () => {
        document.getElementById('default-track')?.remove();
        const video = document.createElement('video');
        video.id = 'default-track';
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
    };

    return {
        getPeer: () => peerRef.current,
        getIceCandidates: () => iceCandidates.current,
        getToSession: () => toSession.current,
        getCallingUser: () => state.callingUser,
        connectPeer, stream, disconnectStream, releaseP2P, setDefaultTrack, streamRoom
    };
};