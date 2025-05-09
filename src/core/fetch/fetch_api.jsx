import { T } from '@/app/common';


async function apiFetch({
    path,
    data = {},
    query,
    method = 'GET',
    headers = {},
    options,
    loading
}) {
    let responseData;

    try {
        const apiURL = process.env.NEXT_PUBLIC_BACKEND_URL;
        const url = new URL(`${apiURL}${path}`);
        const { refreshToken = '' } = T.localStorage.storage('authorization');
        let defaultHeaders = {
            'Content-Type': 'application/json'
        };
        if (query) {
            Object.keys(query).forEach((key) =>
                url.searchParams.append(key, typeof query[key] === 'object' ? JSON.stringify(query[key]) : query[key]?.toString())
            );
        }
        if (data instanceof FormData) {
            defaultHeaders = {};
        } else {
            data = method !== 'GET' ? JSON.stringify(data) : undefined;
        }
        if (loading) T.showLoading();
        const fetchApi = () => fetch(url.href, {
            method: method,
            body: data,
            credentials: 'include',
            headers: {
                ...defaultHeaders,
                ...headers,
                Authorization: `Bearer ${T.localStorage.storage('authorization').accessToken || ''}`
            },
            ...options,
        });
        let response = await fetchApi();
        if (response.status == 401) {
            const getTokenUrl = new URL(apiURL + '/api/public/v1/authentication/access-token');
            getTokenUrl.searchParams.append('refreshToken', refreshToken);
            response = await fetch(getTokenUrl.href, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    ...defaultHeaders
                }
            });
            if (!response.ok()) throw new Error('Require login!');
            await response.json().then(({ accessToken }) => accessToken && T.localStorage.storage('authorization', { accessToken, refreshToken }));
            response = await fetchApi();
        }
        responseData = await response.json();
        if (loading) T.hideLoading();

        if (responseData.error || !response.ok) {
            throw responseData.error || new Error('Bad request!');
        }
    } catch (error) {
        if (loading) T.hideLoading();
        console.error('Fetch Error:', error);
        throw error;
    }

    return responseData;
}


export const client = {
    get: (path, query, options = {}, loading) => {
        return apiFetch({ path, query, options, loading });
    },

    post: (path, data, query, options = {}, loading = true) => {
        return apiFetch({ path, data, query, method: 'POST', options, loading });
    },

    put: (path, data, query, options = {}, loading = true) => {
        return apiFetch({ path, data, query, method: 'PUT', options, loading });
    },

    delete: (path, data, query, options = {}, loading = true) => {
        return apiFetch({ path, data, query, method: 'DELETE', options, loading });
    }
};

export default client;