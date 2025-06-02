'use client';
import { useEffect, useRef } from 'react';
import { T } from '@/app/common';
import ConfirmModal from '@/components/confirm_modal';

export const topics = {
    OFFER: 'offer',
    REFRESH_OFFER: 'refresh_offer',
    RENEGOTIATION: 'renegotiation',
    RELEASE: 'release',
    ANSWER: 'answer',
    ICE: 'ice',
    EXCHANGE_ICE: 'exchange_ice',
    REQUEST_P2P: 'request_p2p',
    RESPONSE_P2P: 'response_p2p',
    CONNECT: 'connect',
    DISCONNECT: 'disconnect'
};
const { ANSWER, ICE, EXCHANGE_ICE, REQUEST_P2P, RESPONSE_P2P, CONNECT, OFFER, REFRESH_OFFER, DISCONNECT, RENEGOTIATION, RELEASE } = topics;
const options = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};
export const useWebRtc = (socketPath) => {
    const iceCandidates = useRef([]);
    const peerRef = useRef();
    const isSendingIce = useRef(false);
    const setUpPeer = async () => {
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

        peerRef.current.addTransceiver('video', { direction: 'sendrecv' }); //inform that use dis Peer to send/recv => no need to add track 1st
        peerRef.current.addTransceiver('audio', { direction: 'sendrecv' });
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
                            T.message.success('Set up SDP successfully');
                            setTimeout(() => T.hideLoading(), 1000);
                            break;
                        case EXCHANGE_ICE:
                            await peerRef.current.addIceCandidate(data);
                            break;
                        case REQUEST_P2P:
                            ConfirmModal({
                                title: 'Calling',
                                onOk: () => socket.send(JSON.stringify({ type: RESPONSE_P2P, to: from })),
                            });
                            break;
                        case RESPONSE_P2P:
                            T.message.success('set up connection');
                            const sdpOffer = await peerRef.current.createOffer();
                            await peerRef.current.setLocalDescription(sdpOffer);
                            socket.send(JSON.stringify({ type: OFFER, data: sdpOffer.sdp }));
                            break;
                        case CONNECT:
                            T.message.success('connect successfully');
                            break;
                        case DISCONNECT:
                            T.message.success('Disconnect successfully');
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
        T.socket.singleton(socketPath).send(JSON.stringify({ type: REQUEST_P2P, to })) || T.showLoading();
    };
    const stream = (to) => {
        if (!to) return T.message.error('Unvailable peer!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: CONNECT, to }));
    };

    const disconnectStream = (to) => {
        if (!to) return T.message.error('Unvailable peer!');
        T.socket.singleton(socketPath).send(JSON.stringify({ type: DISCONNECT, to }));
    };

    return {
        getPeer: () => peerRef.current,
        getIceCandidates: () => iceCandidates.current,
        connectPeer, stream, disconnectStream
    };
};