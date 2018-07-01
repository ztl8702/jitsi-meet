/* @flow */

import {
    LOCAL_RECORDING_ON,
    LOCAL_RECORDING_OFF,
    CLOCK_TICK,
    LOCAL_RECORDING_TOGGLE_DIALOG,
    LOCAL_RECORDING_STATS_UPDATE
} from './actionTypes';

/**
 * Creates an event for switching local recording on or off.
 *
 * @param {bool} on - Whether to switch local recording on or off.
 * @returns {{
 *     type: LOCAL_RECORDING_ON
 * }|{
 *     type: LOCAL_RECORDING_OFF
 * }}
 */
export function toggleRecording(on: boolean) {
    return {
        type: on ? LOCAL_RECORDING_ON : LOCAL_RECORDING_OFF
    };
}

/**
 * Creates an event for toggling the Local Recording Info dialog.
 *
 * @returns {{
 *     type: LOCAL_RECORDING_TOGGLE_DIALOG
 * }}
 */
export function toggleDialog() {
    return {
        type: LOCAL_RECORDING_TOGGLE_DIALOG
    };
}

/**
 * Creates an event that represents a clock tick.
 * This is used for updating the "recording length" field in
 * the Local Recording Info dialog, forcing the UI to re-render
 * on each clock tick.
 *
 * @returns {{
 *     type: CLOCK_TICK
 * }}
 */
export function clockTick() {
    return {
        type: CLOCK_TICK
    };
}

/**
 * Creates a Redux event that carries the local recording
 * stats from each client.
 *
 * @param {*} stats - The stats object.
 * @returns {{
 *     type: LOCAL_RECORDING_STATS_UPDATE,
 *     stats: Object
 * }}
 */
export function statsUpdate(stats: Object) {
    return {
        type: LOCAL_RECORDING_STATS_UPDATE,
        stats
    };
}
