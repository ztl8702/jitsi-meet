export * from './actions';
export * from './actionTypes';
export * from './components';
export * from './controller';

import './reducer';

import { RecordingController } from './controller';

let recordingController = null;

const setupController = () => {
    recordingController = new RecordingController(null);

    window.LocalRecording = {
        signalStart: startRecording,
        signalEnd: stopRecording,
        controller: recordingController
    };
};

setupController();

window.onload = () => {
    recordingController.registerEvents();
}

/**
 * Starts MediaRecorder.
 *
 * @returns {void}
 */
function startRecording() {
    if (!recordingController) setupController();
    recordingController.startRecording();
}

/**
 * Stops MediaRecorder.
 *
 * @returns {undefined}
 */
function stopRecording() {
    recordingController.stopRecording();
}


