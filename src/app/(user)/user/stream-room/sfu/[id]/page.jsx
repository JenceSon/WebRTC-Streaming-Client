'use client';
import { T } from '@/app/common';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { connectLivekitRoom, createParticipantTokenSmManageRoomsV2 } from '@/app/(user)/user/stream-room/redux';
import AdminPage from '@/app/(user)/components/admin_page';
import { Alert, Col, Flex, FloatButton, Row, Space, Spin, Tooltip, Typography, Upload } from 'antd';
import { CloseOutlined, CloudUploadOutlined, InfoCircleOutlined, PauseCircleFilled, PauseCircleOutlined, PlayCircleFilled, PlayCircleOutlined, TeamOutlined, UploadOutlined, UserOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import { TooltipButton } from '@/components/button';
import { useAppRouter } from '@/hooks/router_hook';
import RoomDetail from '../components/room_detail_drawer';
import VideoGridList from '../components/video_grid_list';
import StreamingStats from '../components/streaming_stats';
import StreamControls from '../components/stream_controls';

const pageName = 'livekitRoomPage';
const { RoomEvent, ConnectionState, DisconnectReason } = T.livekit;
const { Connected, ConnectionStateChanged, Disconnected, ParticipantConnected, ParticipantDisconnected, SignalConnected, TrackPublished, TrackUnpublished, TrackStreamStateChanged, TrackSubscribed, TrackUnsubscribed, TrackSubscriptionFailed, RoomMetadataChanged } = RoomEvent;
const { Audio, Video } = T.livekit.Track.Kind;

const VideoContext = createContext();
export const useVideoContext = () => useContext(VideoContext);

export default function DetailsRoomPage({ params }) {
    const roomId = params.id;
    const roomRef = useRef(new T.livekit.Room());
    const remoteStreamsRef = useRef({});
    const remoteVideosRef = useRef({});
    const hiddenVideoRef = useRef();
    const localVideoRef = useRef();
    const webcamRef = useRef();
    const roomDetailsRef = useRef();
    const [state, setState] = useState({});
    const retryConnect = useRef(true);
    const router = useAppRouter();
    const connect = async () => {
        if (await connectLivekitRoom(roomId, roomRef.current)) {
            const room = roomRef.current;
            const { localParticipant, remoteParticipants } = room;
            localParticipant.setTrackSubscriptionPermissions(false);
            remoteParticipants.forEach((participant, id) => {
                const remoteStream = remoteStreamsRef.current[id];
                if (!remoteStream) {
                    const newStream = new MediaStream();
                    if (remoteVideosRef.current[id]) remoteVideosRef.current[id].srcObject = newStream;
                    remoteStreamsRef.current[id] = newStream;
                }
            });
            setState({});
        }
    };

    const setUpRoom = () => {
        const room = roomRef.current;
        /**
         * ChatMessage
         * Connected => render UI
         * ConnectionStateChanged
         * Disconnected
         * LocalAudioSilenceDetected (advance, later)
         * LocalTrackPublished (advance, later)
         * LocalTrackSubscribed (advance, later)
         * LocalTrackUnpublished (advance, later)
         * ParticipantConnected 
         * ParticipantDisconnected
         * SignalingConnected (use for notify to publish tracks)
         * TrackPublished (advance, later)
         * TrackUnpublished (advance, later)
         * TrackStreammsStateChanged =>  if remote paused (not unpublish)
         * TrackSubscribed => handle when local click to rcv track published
         * TrackUnsubcribed => local stop rcv track or remote has remove/replace track
         * TrackSubscriptionFailed => fail to subscribed
         * 
         */
        room.addListener(ConnectionStateChanged, state => console.log('Room state: ', state));
        room.addListener(Disconnected, async (reason) => {
            if (reason == DisconnectReason.USER_REJECTED && retryConnect.current) {
                retryConnect.current = false;
                T.localStorage.storage(pageName, { ...T.localStorage.storage(pageName), [roomId]: undefined });
                const result = await createParticipantTokenSmManageRoomsV2(roomId);
                if (result) return connect();
            } else if (reason == DisconnectReason.CLIENT_INITIATED) {
                return T.message.info('Room has been disconnected');
            }
            router.push('/user/stream-room');
            T.localStorage.storage(pageName, { ...T.localStorage.storage(pageName), [roomId]: undefined });
            T.message.info('You have been out of room');

        });
        room.addListener(ParticipantConnected, participant => {
            const { identity: id, name } = participant;
            const remoteStream = remoteStreamsRef.current[id];
            if (!remoteStream) {
                const newStream = new MediaStream();
                if (remoteVideosRef.current[id]) remoteVideosRef.current[id].srcObject = newStream;
                remoteStreamsRef.current[id] = newStream;
                setState(pre => ({ ...pre }));
                T.message.info(`${name} has joined`);
            }
        });
        room.addListener(ParticipantDisconnected, participant => {
            const { identity: id, name } = participant;
            const remoteStream = remoteStreamsRef.current[id];
            if (remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop() || remoteStream.removeTrack(track));
                if (remoteVideosRef.current[id]) {
                    remoteVideosRef.current[id].srcObject = undefined;
                    delete remoteVideosRef.current[id];
                }
                delete remoteStreamsRef.current[id];
            }
            setState(pre => ({ ...pre }));
            T.message.info(`${name} has left`);
        });

        room.addListener(TrackStreamStateChanged, (publication, streamState, participant) => {
            const { name } = participant;
            if (streamState == T.livekit.Track.StreamState.Paused) T.message.info(`${name} has pause stream`);
        });

        room.addListener(TrackSubscribed, (track, publication, participant) => {
            const { identity: id, name } = participant;
            const remoteStream = remoteStreamsRef.current[id];
            remoteStream?.addTrack(track.mediaStreamTrack);
            // T.message.info(`Subcribed track from ${name}`);
        });

        room.addListener(TrackUnsubscribed, (track, publication, participant) => {
            const { identity: id, name } = participant;
            const remoteStream = remoteStreamsRef.current[id];
            remoteStream?.removeTrack(track.mediaStreamTrack);
            const remoteVideo = remoteVideosRef.current[id];
            remoteVideo.load();
            // T.message.info(`Unsubcribe track from ${name}`);
        });

        room.addListener(TrackSubscriptionFailed, (trackSid, participant, reason) => {
            const { name } = participant;
            console.error(reason);
            // T.message.error(new Error(`Failed to subscribe track from ${name}!`));
        });
    };


    useEffect(() => {
        setUpRoom();
        connect();
        return () => unmount();
    }, []);

    const handleClearSrc = async () => {
        try {
            if (localVideoRef.current?.srcObject) {
                const tracks = localVideoRef.current.srcObject.getTracks();
                await roomRef.current.localParticipant.unpublishTracks(tracks);
                tracks.forEach(track => track.stop() || localVideoRef.current.srcObject.removeTrack(track));
            }
            if (localVideoRef.current) {
                localVideoRef.current.pause();
                localVideoRef.current.srcObject = null;
            }
            if (hiddenVideoRef.current) {
                hiddenVideoRef.current.pause();
                hiddenVideoRef.current.removeAttribute('src');
            }
            webcamRef.current?.getTracks().forEach(track => track.stop() || webcamRef.current.removeTrack(track));
        } catch (error) {
            console.error(error);
            T.message.error(error);
        }
    };

    const unmount = async () => {
        await handleClearSrc();
        localVideoRef.current = undefined;
        hiddenVideoRef.current = undefined;
        webcamRef.current = undefined;
        await roomRef.current.disconnect();
    };

    if (roomRef.current.state != ConnectionState.Connected) return (
        <Row gutter={16} className='!h-screen'>
            <Spin tip='loading...' size='large' className='!w-full !self-center !justify-self-center' />
        </Row>
    );


    const handleBeforeUpload = async file => {
        try {
            await handleClearSrc();
            const url = URL.createObjectURL(file);
            hiddenVideoRef.current.src = url;
            const stream = hiddenVideoRef.current.captureStream();
            localVideoRef.current.srcObject = stream;
        } catch (error) {
            console.error(error);
            T.message.error(error);
        }
    };

    const handleUsingWebcam = async () => {
        try {
            await handleClearSrc();
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideoRef.current.srcObject = stream;
            webcamRef.current = stream;
        } catch (error) {
            console.error(error);
            T.message.error(error);
        }
    };

    const { localParticipant, remoteParticipants } = roomRef.current;
    return (<>
        <AdminPage
            title={<Typography.Text copyable className='!text-2xl !font-bold !text-primary'>{roomId}</Typography.Text>}
            icon={<TeamOutlined />}
            breadcrumbItems={[
                {
                    title: 'Stream'
                },
                {
                    title: 'Room',
                    href: '/user/stream-room'
                },
                {
                    title: 'Id'
                }
            ]}
        >
            <VideoContext.Provider value={{ room: roomRef.current, remoteVideosRef, remoteStreamsRef, hiddenVideoRef, localVideoRef }}>
                <video ref={hiddenVideoRef} autoPlay playsInline muted className='hidden' />
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={24} md={16}>
                        <Flex vertical gap='small' align='flex-start' justify='center'>
                            {
                                !!remoteParticipants.size && <VideoGridList />
                            }
                            <div className={`!w-${remoteParticipants.size ? '2/5 max-w-[40%]' : 'full'} !relative !mx-auto`}>
                                <video ref={localVideoRef} autoPlay playsInline className='!w-full border aspect-video' />
                                <TooltipButton title='Clear source' icon={<CloseOutlined />} onClick={handleClearSrc} color='default' variant='outlined' className='!absolute !top-0 !right-0 z-10' />
                                <Alert
                                    message={`${localParticipant.name} (You)`}
                                    type={JSON.parse(localParticipant.metadata).role == 'host' ? 'info' : 'success'}
                                    className='w-fit rounded-xl shadow-sm !absolute bottom-0 left-1/2 -translate-x-1/2 !text-[1.0vw] !leading-[2vw] !px-[0.75vw] !py-[0.25vw]'
                                    icon={<UserOutlined />}
                                    showIcon
                                />
                            </div>
                            <StreamControls />
                        </Flex>
                    </Col>
                    <Col xs={24} sm={24} md={8}>
                        <StreamingStats />
                    </Col>
                </Row>
                <RoomDetail ref={roomDetailsRef} />
            </VideoContext.Provider>
        </AdminPage>
        <FloatButton.Group>
            <Upload beforeUpload={handleBeforeUpload} showUploadList={false} accept='video/*'>
                <FloatButton icon={<UploadOutlined />} tooltip='Upload video' />
            </Upload>
            <FloatButton tooltip='Using webcam' icon={<VideoCameraAddOutlined />} onClick={handleUsingWebcam} />
            <FloatButton tooltip='Room details' icon={<InfoCircleOutlined />} onClick={() => roomDetailsRef.current.show()} />
        </FloatButton.Group>
    </>);
}