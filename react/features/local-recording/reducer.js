import { ReducerRegistry } from '../base/redux';

import {
    LOCAL_RECORDING_TOGGLE
} from './actionTypes';
import { RecordingController } from './RecordingController';


ReducerRegistry.register('features/local-recording', (state = {}, action) => {
    console.log(state);
    switch (action.type) {
    case LOCAL_RECORDING_TOGGLE: {
        const oldOnOffState = state.on;
        const newOnOffState = oldOnOffState === null ? true : !oldOnOffState;

        if (newOnOffState) {
            startRecording();
        } else {
            stopRecording();
        }

        return {
            ...state,
            on: newOnOffState
        };
    }
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

