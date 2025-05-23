import { T } from '@/app/common';

const streamGetList = 'stream:GetList';
const redux = {
    parent: 'stream',
    reducers: {
        streamReducer: (state = { list: [] }, action) => {
            switch (action.type) {
                case streamGetList:
                    return { ...state, list: action.payload };
                default:
                    return state;
            }
        }
    }
};

export const getPageStream = () => async dispatch => {
    try {
        const url = '/api/v1/streaming/sessions/all';
        const list = await T.client.get(url).then(res => res.list);
        dispatch({ type: streamGetList, payload: list });
        return { list };
    } catch (error) {
        T.message.error(error);
    }
};

export default { redux };