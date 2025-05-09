'use client';
import { useAppDispatch } from '@/hooks/redux_hooks';
import { useAppRouter } from '@/hooks/router_hook';
import React, { useEffect } from 'react';
import { fetchSystemState } from './redux';

export default function MyApp() {
    const router = useAppRouter();
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchSystemState()).then(result => result ? router.push('/user') : router.push('/login'));
    }, []);
    return (<></>);
}