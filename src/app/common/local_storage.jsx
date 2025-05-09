'use client';
export const localStorageLib = {
    has: (cookieName) => localStorage.getItem(cookieName),

    getCookiePage: (cookieName, key) => {
        const pageData = localStorageLib.storage(cookieName);
        return (pageData && pageData[key]) ? pageData[key] : '';
    },

    cookie: (cname, cvalue, exdays) => {
        if (cvalue === undefined) {
            const name = cname + '=';
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i].trimStart();
                if (c.indexOf(name) === 0) {
                    try {
                        return JSON.parse(c.substring(name.length, c.length));
                    } catch {
                        return {};
                    }
                }
            }
            return {};
        } else {
            let d = new Date();
            d.setTime(d.getTime() + ((exdays === undefined ? 60 : exdays) * 24 * 60 * 60 * 1000));
            document.cookie = cname + '=' + JSON.stringify(cvalue) + ';expires=' + d.toUTCString() + ';path=/';
        }
    },
    storage: (cname, cvalue) => {
        if (cvalue != null) {
            localStorage.setItem(cname, JSON.stringify(cvalue));
        } else {
            try {
                return JSON.parse(localStorage.getItem(cname)) || {};
            } catch {
                return {};
            }
        }
    },

    pageKeyName: {
        pageNumber: 'N',
        pageSize: 'S',
        pageCondition: 'C',
        filter: 'F',
        advancedSearch: 'A'
    },

    getCookiePageCondition: cookieName => {
        const pageCondition = localStorageLib.pageKeyName.pageCondition;
        const pageData = localStorageLib.storage(cookieName);
        return pageData && (pageData[pageCondition] ?? '');
    },
    initPage: (cookieName) => {
        let initData = localStorageLib.storage(cookieName);
        const { pageNumber, pageSize, pageCondition, filter, advancedSearch } = localStorageLib.pageKeyName;
        if (initData[pageNumber] == null) initData[pageNumber] = 1;
        if (initData[pageSize] == null) initData[pageSize] = 50;
        if (initData[pageCondition] == null) initData[pageCondition] = {};
        if (initData[filter] == null) initData[filter] = {};
        if (initData[advancedSearch] == null) initData[advancedSearch] = false;
        localStorageLib.storage(cookieName, initData);
    },

    updatePage: (cookieName, pageNumber, pageSize, pageCondition, filter, advancedSearch) => {
        const updateStatus = {}, oldStatus = localStorageLib.storage(cookieName);
        const { pageNumber: pageN, pageSize: pageS, pageCondition: pageC, filter: pageF, advancedSearch: pageSearch } = localStorageLib.pageKeyName;
        updateStatus[pageN] = pageNumber ? pageNumber : oldStatus[pageN];
        updateStatus[pageS] = pageSize ? pageSize : oldStatus[pageS];
        updateStatus[pageC] = pageCondition != null || pageCondition == '' ? pageCondition : oldStatus[pageC];
        updateStatus[pageF] = filter ? filter : oldStatus[pageF];
        updateStatus[pageSearch] = advancedSearch != null ? advancedSearch : oldStatus[pageSearch];
        localStorageLib.storage(cookieName, updateStatus);
        return {
            pageNumber: updateStatus[pageN],
            pageSize: updateStatus[pageS],
            pageCondition: updateStatus[pageC],
            filter: updateStatus[pageF],
            advancedSearch: updateStatus[pageSearch]
        };
    },

    onResize: () => {
        const marginTop = 6 + $('header').height(),
            marginBottom = 6 + $('footer').height();
        $('.site-content').css('margin', marginTop + 'px 0 ' + marginBottom + 'px 0');
    }
};