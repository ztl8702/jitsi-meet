import {
    LOCAL_RECORDING_ON,
    LOCAL_RECORDING_OFF,
    CLOCK_TICK,
    LOCAL_RECORDING_TOGGLE_DIALOG
} from './actionTypes';

/**
 * Switches local recording on or off.
 *
 * @returns {{
 *     type: LOCAL_RECORDING_TOGGLE
 * }}
 */
export function toggleRecording(on) {
    return {
        type: on ? LOCAL_RECORDING_ON : LOCAL_RECORDING_OFF
    };
}

export function toggleDialog() {
    return {
        type: LOCAL_RECORDING_TOGGLE_DIALOG
    };
}

export function clockTick() {
    return {
        type: CLOCK_TICK
    };
}

