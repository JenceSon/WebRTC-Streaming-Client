import { T } from './common';

const systemStateUserSetDetail = 'systemStateUser:SetDetail';
const systemStateMenusSetList = 'systemStateMenus:SetList';
const systemStateThemeSetAlgor = 'systemStateTheme:SetAlgor';
const redux = {
    parent: 'systemState',
    reducers: {
        userReducer: (state = { user: null }, action) => {
            switch (action.type) {
                case systemStateUserSetDetail:
                    return { ...state, user: action.payload.user };
                default:
                    return state;
            }
        },
        menusReducer: (state = { menus: {} }, action) => {
            switch (action.type) {
                case systemStateMenusSetList:
                    return { ...state, menus: action.payload.menus };
                default:
                    return state;
            }
        },
        themeReducer: (state = { theme: 'white' }, action) => {
            switch (action.type) {
                case systemStateThemeSetAlgor:
                    return { ...state, ...action.payload };
                default:
                    return state;
            }
        }
    }
};

export const fetchSystemState = () => async dispatch => {
    try {
        const url = '/api/v1/user/session';
        const sessionUser = await T.client.get(url).then(res => res.sessionUser);
        const { menus, menusPath } = T.buildMenus(sessionUser);
        dispatch({ type: systemStateUserSetDetail, payload: { user: sessionUser } });
        dispatch({ type: systemStateMenusSetList, payload: { menus } });
        return { sessionUser, menus, menusPath };
    } catch (error) {
        return false;
    }
};

export const loginSystemState = (data) => async dispatch => {
    try {
        const url = '/api/public/v1/authentication/login/password';
        const { sessionUser, refreshToken, accessToken } = await T.client.post(url, { ...data });
        const { menus, menusPath } = T.buildMenus();
        T.message.success('Đăng nhập thành công');
        dispatch({ type: systemStateUserSetDetail, payload: { user: sessionUser } });
        dispatch({ type: systemStateMenusSetList, payload: { menus: menus } });
        T.localStorage.storage('authorization', { refreshToken, accessToken });
        return { sessionUser, menus, menusPath, refreshToken };
    } catch (error) {
        T.message.error(error);
        dispatch({ type: systemStateUserSetDetail, payload: { user: null } });
        dispatch({ type: systemStateMenusSetList, payload: { menus: {} } });
        return false;
    }
};


export const logoutSystemState = async () => {
    try {
        const url = '/api/v1/authentication/log-out';
        await T.client.post(url);
        T.message.success('Đăng xuất thành công!');
        return true;
    } catch (error) {
        T.message.error(error);
        return false;
    }
};

export const signUpSystemState = async (data) => {
    try {
        const url = '/api/public/v1/authentication/sign-up';
        await T.client.post(url, { ...data });
        T.message.success('Tạo tài khoản thành công');
        return true;
    } catch (error) {
        T.message.error(error);
        return false;
    }
};

export default { redux };