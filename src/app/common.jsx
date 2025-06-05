'use client';
import { client } from '@/core/fetch/fetch_api';
import { message } from 'antd';
import *  as lodash from 'lodash-es';
import { localStorageLib } from './common/local_storage';
import dayjs from 'dayjs';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const hostname = typeof location !== 'undefined' ? location.hostname : null;
const T = {
    debug:
        hostname === 'localhost' || hostname === '127.0.0.1',
    //fetch API--------------------------------------------------------------------------------
    client,
    //Date--------------------------------------------------------------------------------
    dateToText: (date, format) => dayjs(date).format(format ? format : 'DD/MM/YYYY HH:mm:ss'),
    dateToNumber: (date, h = 0, m = 0, s = 0, ms = 0, format = true) => {
        if (isNaN(date.getTime?.())) return null;
        format && date.setHours?.(h, m, s, ms);
        return date.getTime?.();
    },
    numberToDate: (date) => {
        return date ? dayjs(parseInt(date)) : '';
    },
    //Alert--------------------------------------------------------------------------------
    message: {
        ...message,
        error: (e) => {
            if (typeof e === 'string') message.error(e);
            else message.error(e.message || 'Lỗi hệ thống!');
            console.error(e);
        }
    },
    showLoading: () => {
        message.loading('Đang xử lý...', 0);
        //Tạo lớp phủ ngăn người dùng click
        const backdrop = document.createElement('div');
        backdrop.id = 'backdrop-element-unique';
        backdrop.className = 'fixed inset-0 flex items-center justify-center bg-slate-100 bg-opacity-0 z-[1000]';
        document.body.appendChild(backdrop);
    },
    hideLoading: () => {
        message.destroy();
        //Xóa lớp phủ
        const backdrop = document.getElementById('backdrop-element-unique');
        backdrop?.remove?.();
    },
    //Lodash lib--------------------------------------------------------------------------------
    lodash,
    localStorage: localStorageLib,
    //String lib-------------------------------------------------------------------------------
    string: {
        toUpperCase: (str, type = 'all') => {
            if (!str) return '';
            if (type == 'all') return lodash.toUpper(str);
            if (type == 'sentence') return str.charAt(0).toUpperCase() + str.slice(1);
            if (type == 'word') return lodash.upperFirst(str);
            if (type == 'words') return lodash.words(str).map(word => lodash.upperFirst(word)).join(' ');
            return str;
        }
    },
    //download---------------------------------------------------------------
    download: (path, name, query) => {
        const url = new URL(`${backendUrl}${path}`);
        if (query) {
            Object.keys(query).forEach((key) =>
                url.searchParams.append(key, typeof query[key] === 'object' ? JSON.stringify(query[key]) : query[key]?.toString())
            );
        }
        let link = document.createElement('a');
        link.target = '_blank';
        link.download = name;
        link.href = url.href;
        link.click();
    },
    buildMenus: () => {
        const menus = {};
        const context = require.context('@/app/', true, /menu\.js$/);
        const menusPath = {};
        menusPath['/user'] = true;
        context.keys().forEach(key => {
            const menu = context(key).default;
            let path = key.replace('./', '/').replace('/menu.js', '');
            // Remove dynamic segments (for static routes)
            path = path.replace(/\([^)]+\)\//g, '');

            // Replace dynamic segments [param] with :param (for dynamic routes)
            path = path.replace(/\[([^\]]+)\]/g, ':$1');
            if (!menusPath[path]) menusPath[path] = true;
        });
        return { menus, menusPath };
    },
    //socket---------------------------------------------------------------------
    socket: {
        _singleton: {},
        create: (path = '/signal') => {
            if (!T.socket._singleton[path]) {
                const { refreshToken } = T.localStorage.storage('authorization');
                let socket;
                if (refreshToken) socket = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}${path}?token=${refreshToken}`);
                else socket = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/guest`);
                socket.onopen = () => console.log(`${path}: Websocket connected`);
                socket.onclose = event => {
                    console.log(`${path}: Websocket closed - ${event.code}`);
                };
                socket.onerror = (error) => {
                    console.error(`${path}: ${error}`);
                };
                T.socket._singleton[path] = socket;
                return socket;
            }
            else return T.socket._singleton[path];
        },
        singleton: (path = '/signal') => T.socket._singleton[path] || T.socket.create(path),
        close: (path = '/signal') => {
            if (T.socket._singleton[path]) {
                T.socket._singleton[path].close();
                T.socket._singleton[path] = undefined;
            }
        }
    }
};

// T.socket = socket;

export { T };
