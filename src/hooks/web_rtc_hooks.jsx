'use client';
import { useEffect, useRef } from 'react';
import { T } from '@/app/common';

export const useWebRtc = (socketPath) => {
    const iceCandidates = useRef([]);
    const peerRef = useRef();
    const setUp = async () => {
        const socket = T.socket.singleton(socketPath);

        peerRef.current = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        peerRef.current.oniceconnectionstatechange = () => {
            console.log('state ice: ', peerRef.current.iceConnectionState);
        };

        peerRef.current.onconnectionstatechange = () => {
            console.log('state conn : ', peerRef.current.connectionState);
        };

        peerRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
                iceCandidates.current.push({ candidate, sdpMid, sdpMLineIndex });
            }
            else {
                console.log('Gathering ice done');
            }
        };

        socket.addEventListener('message', async msg => {
            try {
                const message = JSON.parse(msg.data);
                const { type, data, error, from } = message;
                if (error) return T.message.error(error);
                switch (type) {
                    case 'answer':
                        await peerRef.current.setRemoteDescription({ type, sdp: data });
                        T.message.success('Set up SDP successfully');
                        break;
                    case 'ice':
                        T.message.success('Add ICE successfully');
                        await Promise.all(data.map(ice => peerRef.current.addIceCandidate(ice)));
                        socket.send(JSON.stringify({ type: 'exchange_ice', data: iceCandidates.current }));
                        break;
                    case 'exchange_ice':
                        T.message.success('Exchange ICE successfully');
                        break;
                    case 'request_p2p':
                        socket.send(JSON.stringify({ type: 'response_p2p', to: from }));
                        break;
                    case 'response_p2p':
                        T.message.success('set up connection');
                        const sdpOffer = await peerRef.current.createOffer();
                        await peerRef.current.setLocalDescription(sdpOffer);
                        T.socket.singleton(socketPath).send(JSON.stringify({ type: 'offer', data: sdpOffer.sdp }));
                        break;
                    case 'connect':
                        T.message.success('connect successfully');
                        break;
                    default:
                        T.message.error('Unknow message from sever: ', type);
                        break;
                }
            } catch (error) {
                console.error(error);
                T.message.error('Error handling message!');
            }
        });
    };
    useEffect(() => {
        setUp();
        return () => T.socket.close(socketPath);
    }, []);
    const connectPeer = (to) => T.socket.singleton(socketPath).send(JSON.stringify({ type: 'request_p2p', to }));
    const stream = (to) => T.socket.singleton(socketPath).send(JSON.stringify({ type: 'connect', to }));
    return {
        peer: () => peerRef.current,
        iceCandidates: () => iceCandidates.current,
        connectPeer, stream
    };
};