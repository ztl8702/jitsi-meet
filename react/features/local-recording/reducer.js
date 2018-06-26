/* @flow */

import { ReducerRegistry } from '../base/redux';

import {
    LOCAL_RECORDING_OFF,
    CLOCK_TICK,
    LOCAL_RECORDING_ON,
    LOCAL_RECORDING_TOGGLE_DIALOG,
    LOCAL_RECORDING_STATS_UPDATE
} from './actionTypes';

declare var LocalRecording: Object;

ReducerRegistry.register('features/local-recording', (state = {}, action) => {
    console.log(state);
    switch (action.type) {
    case LOCAL_RECORDING_ON: {
        return {
            ...state,
            on: true,
            recordingStartedAt: new Date(Date.now()),
            encodingFormat: LocalRecording.controller._format
        };
    }
    case LOCAL_RECORDING_OFF:
        return {
            ...state,
            on: false,
            recordingStartedAt: null
        };
    case LOCAL_RECORDING_TOGGLE_DIALOG:
        return {
            ...state,
            showDialog: state.showDialog === undefined
                || state.showDialog === false
        };
    case CLOCK_TICK:
        return {
            ...state,
            currentTime: new Date(Date.now())
        };
    case LOCAL_RECORDING_STATS_UPDATE:
        return {
            ...state,
            stats: action.stats
        };
    default:
        return state;
    }
});
