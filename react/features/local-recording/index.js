export * from './actions';
export * from './actionTypes';
export * from './components';
export * from './controller';

import { RecordingController } from './controller';

const recordingController = new RecordingController(null);

window.LocalRecording = {
    signalStart: recordingController.startRecording.bind(recordingController),
    signalEnd: recordingController.stopRecording.bind(recordingController),
    controller: recordingController
};

import './middleware';
import './reducer';
