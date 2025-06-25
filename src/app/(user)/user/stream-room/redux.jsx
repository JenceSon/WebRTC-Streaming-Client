import { T } from '@/app/common';

const streamRoomGet = 'streamRoom:Get';
const livekitStreamRoomGetAll = 'livekitStreamRoom:GetAll';
const redux = {
    parent: 'streamRoom',
    reducers: {
        streamRoomReducer: (state = { room: null, list: [] }, action) => {
            switch (action.type) {
                case streamRoomGet:
                    return { ...state, room: action.payload };
                case livekitStreamRoomGetAll:
                    return { ...state, list: action.payload };
                default:
                    return state;
            }
        }
    }
};

const livekitRoomPageName = 'livekitRoomPage';

export const getRoomSmManageRooms = (roomId) => async dispatch => {
    try {
        const url = '/api/v1/streaming/rooms/item';
        const room = await T.client.get(url, { roomId }).then(res => res.room);
        dispatch({ type: streamRoomGet, payload: room });
        return { room };
    } catch (error) {
        T.message.error(error);
        dispatch({ type: streamRoomGet, payload: null });
        return false;
    }
};

export const createRoomSmManageRooms = async () => {
    try {
        const url = '/api/v1/streaming/rooms/item';
        const roomId = await T.client.post(url).then(res => res.roomId);
        T.message.success('Create new group call successfully');
        return roomId;
    } catch (error) {
        console.error(error);
        T.message.error(error);
        return false;
    }
};

export const deleteRoomSmManageRooms = async roomId => {
    try {
        const url = '/api/v1/streaming/rooms/item';
        await T.client.delete(url, { roomId });
        T.message.success('Release group call successfully');
        return true;
    } catch (error) {
        console.error(error);
        T.message.error(error);
        return false;
    }
};

export const getRoomSmManageRoomsV2 = id => async dispatch => {
    try {
        const url = '/api/v1/streaming/rooms-v2/room/item';
        const room = await T.client.get(url, { id }).then(res => res.room);
        dispatch({ type: streamRoomGet, payload: room });
        return { room };
    } catch (error) {
        console.error(error);
        dispatch({ type: streamRoomGet, payload: null });
        T.message.error(error);
        return false;
    }
};

export const getAllRoomsSmManageRoomsV2 = () => async dispatch => {
    try {
        const url = '/api/v1/streaming/rooms-v2/room/all';
        const list = await T.client.get(url).then(res => res.list);
        dispatch({ type: livekitStreamRoomGetAll, payload: list });
        return { list };
    } catch (error) {
        console.error(error);
        dispatch({ type: livekitStreamRoomGetAll, payload: [] });
        T.message.error(error);
        return false;
    }
};

export const createHostTokenSmManageRoomsV2 = async data => {
    try {
        const url = '/api/v1/streaming/rooms-v2/host-token/item';
        const { token, roomId } = await T.client.post(url, data).then(res => res.item);
        T.localStorage.storage(livekitRoomPageName, { ...T.localStorage.storage(livekitRoomPageName), [roomId]: token });
        return { token, roomId };
    } catch (error) {
        console.error(error);
        T.message.error(error);
        return false;
    }
};

export const createParticipantTokenSmManageRoomsV2 = async id => {
    try {
        const url = '/api/v1/streaming/rooms-v2/participant-token/item';
        let token = T.localStorage.storage(livekitRoomPageName)[id];
        const data = { id };
        if (token) data.token = token;
        const { token: newToken } = await T.client.post(url, data).then(res => res.item);
        T.localStorage.storage(livekitRoomPageName, { ...T.localStorage.storage(livekitRoomPageName), [id]: newToken });
        return { token, roomId: id };
    } catch (error) {
        console.error(error);
        T.message.error(error);
        return false;
    }
};

export const updateRoomSmManageRoomsV2 = async data => {
    try {
        const url = '/api/v1/streaming/rooms-v2/room/item';
        await T.client.put(url, data);
        const newToken = await T.client.post('/api/v1/streaming/rooms-v2/participant-token/item', { id: data.id }).then(res => res.item.token);
        T.localStorage.storage(livekitRoomPageName, { ...T.localStorage.storage(livekitRoomPageName), [data.id]: newToken });
        T.message.success('Update room config successfully');
        return true;
    } catch (error) {
        console.error(error);
        T.message.error(error);
        return false;
    }
};

export const connectLivekitRoom = async (roomId, room, option = {}) => {
    try {
        const token = T.localStorage.storage(livekitRoomPageName)[roomId];
        if (!token) throw new Error('Missing token!');
        await T.livekit.connect(token, room, option);
        T.message.success('Room has been connected');
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const deleteRoomSmManageRoomsV2 = async (id) => {
    try {
        const url = '/api/v1/streaming/rooms-v2/room/item';
        await T.client.delete(url, { id });
        T.localStorage.storage(livekitRoomPageName, { ...T.localStorage.storage(livekitRoomPageName), [id]: undefined });
        T.message.success('Delete room successfully');
        return true;
    } catch (error) {
        console.error(error);
        T.message.error(error);
        return false;
    }
};

//just release room, doesn't remove token/room
export const deleteParticipantSmManageRoomsV2 = async (id) => {
    try {
        const url = '/api/v1/streaming/rooms-v2/room-participants/item';
        await T.client.delete(url, { id });
        T.message.success('Release room successfully');
        return true;
    } catch (error) {
        console.error(error);
        T.message.error(error);
        return false;
    }
};

export default { redux };