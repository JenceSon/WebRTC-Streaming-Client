import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { thunk } from 'redux-thunk';
let reducers = {};
let reducerContainer = {};

const context = require.context('../', true, /redux\.jsx$/);
context.keys().forEach((key) => {
    const storeModule = context(key).default;
    if (storeModule.redux) {
        const { redux } = storeModule;
        if (redux.parent && redux.reducers) {
            if (!reducerContainer[redux.parent]) {
                reducerContainer[redux.parent] = {};
            }
            reducerContainer[redux.parent] = Object.assign(reducerContainer[redux.parent], redux.reducers);
        }
        else {
            Object.keys(redux.reducers).forEach(key => reducers[key] = redux.reducers[key]);
        }
    }
});


Object.keys(reducerContainer).forEach((key) => {
    reducers[key] = combineReducers(reducerContainer[key]);
});
// Combine all reducers
const rootReducer = combineReducers(reducers);

export const store = configureStore({
    reducer: rootReducer,
    middleware: () => [thunk],
});