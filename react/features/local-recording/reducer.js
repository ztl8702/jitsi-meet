/* @flow */

import { ReducerRegistry } from '../base/redux';
import {
    CLOCK_TICK,
    LOCAL_RECORDING_ENGAGED,
    LOCAL_RECORDING_STATS_UPDATE,
    LOCAL_RECORDING_TOGGLE_DIALOG,
    LOCAL_RECORDING_UNENGAGED
} from './actionTypes';
import { recordingController } from './controller';

ReducerRegistry.register('features/local-recording', (state = {}, action) => {
    console.log(state);
    switch (action.type) {
    case LOCAL_RECORDING_ENGAGED: {
        return {
            ...state,
            isEngaged: true,
            recordingStartedAt: new Date(Date.now()),
            encodingFormat: recordingController._format
        };
    }
    case LOCAL_RECORDING_UNENGAGED:
        return {
            ...state,
            isEngaged: false,
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
