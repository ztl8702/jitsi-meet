import { ReducerRegistry } from '../base/redux';

import {
    LOCAL_RECORDING_TOGGLE
} from './actionTypes';


ReducerRegistry.register('features/local-recording', (state = {}, action) => {
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

// let myAudioStream = null;
let mediaRecorder = null;

/**
 * Starts MediaRecorder.
 *
 * @returns {void}
 */
function startRecording() {
    if (mediaRecorder === null) {
        navigator.getUserMedia(

            // constraints - only audio needed for this app
            {
                audioBitsPerSecond: 256000, // 256 kbps
                audio: true,
                mimeType: 'application/ogg'
            },

            // Success callback
            stream => {
                // myAudioStream = stream;
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => saveMediaData(e.data);
            },

            // Error callback
            err => {
                console.log(`The following gUM error occurred: ${err}`);
            }
        );
    }
    mediaRecorder.start();
}

/**
 * Stops MediaRecorder.
 *
 * @returns {undefined}
 */
function stopRecording() {
    mediaRecorder.stop();
}

/**
 * Saves audio data to a file.
 *
 * @param {*} data - Audio data from MediaRecorder.
 * @returns {undefined}
 */
function saveMediaData(data) {
    const audioURL = window.URL.createObjectURL(data);

    console.log('Audio URL:', audioURL);

    // auto save audio
    const a = document.createElement('a');

    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = audioURL;
    a.download = 'recording.ogg';
    a.click();
}
