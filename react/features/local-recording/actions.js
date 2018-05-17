import {
    LOCAL_RECORDING_TOGGLE
} from './actionTypes';

/**
 * Switches local recording on or off.
 *
 * @returns {{
 *     type: LOCAL_RECORDING_TOGGLE
 * }}
 */
export function toggleRecording() {
    return {
        type: LOCAL_RECORDING_TOGGLE
    };
}
