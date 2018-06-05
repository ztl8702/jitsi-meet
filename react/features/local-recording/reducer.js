import { ReducerRegistry } from '../base/redux';

import {
    LOCAL_RECORDING_TOGGLE, CLOCK_TICK
} from './actionTypes';
import { RecordingController } from './recording';


ReducerRegistry.register('features/local-recording', (state = {}, action) => {
    console.log(state);
    switch (action.type) {
    case LOCAL_RECORDING_TOGGLE: {
        const oldOnOffState = state.on;
        const newOnOffState = oldOnOffState === null ? true : !oldOnOffState;

        if (newOnOffState) {
            startRecording();

            return {
                ...state,
                on: newOnOffState,
                recordingStartedAt: new Date(Date.now()),
                encodingFormat: 'flac'
            };
        } else {
            stopRecording();

            return {
                ...state,
                on: newOnOffState,
                recordingStartedAt: null
            };
        }

        
    }
    case CLOCK_TICK:
        return {
            ...state,
            currentTime: new Date(Date.now())
        };
    default:
        return state;
    }
});

const recordingController = new RecordingController();

/**
 * Starts MediaRecorder.
 *
 * @returns {void}
 */
function startRecording() {
    recordingController.startRecording();
}

/**
 * Stops MediaRecorder.
 *
 * @returns {undefined}
 */
function stopRecording() {
    recordingController.stopRecording().then(
        () => recordingController.downloadRecordedData());
}

