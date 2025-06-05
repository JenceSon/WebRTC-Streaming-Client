import { T } from '@/app/common';

const streamRoomCreate = 'streamRoom:Create';
const redux = {
    parent: 'streamRoom',
    reducers: {
        streamRoomReducer: (state = { room: null }, action) => {
            switch (action.type) {
                case streamRoomCreate:
                    return { ...state, room: action.payload };
                default:
                    return state;
            }
        }
    }
};

export const getRoomSmManageRooms = (roomId) => async dispatch => {
    try {
        const url = '/api/v1/streaming/rooms/item';
        const room = await T.client.get(url, { roomId }).then(res => res.room);
        dispatch({ type: streamRoomCreate, payload: room });
        return { room };
    } catch (error) {
        T.message.error(error);
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
        T.message.error(error);
        return false;
    }
};

export default { redux };