/* @flow */

import {
    LOCAL_RECORDING_ENGAGED,
    LOCAL_RECORDING_UNENGAGED,
    CLOCK_TICK,
    LOCAL_RECORDING_TOGGLE_DIALOG,
    LOCAL_RECORDING_STATS_UPDATE
} from './actionTypes';

/**
 * Signals state change in local recording engagement.
 * In other words, the events of the local WebWorker / MediaRecorder
 * starting to record and finishing recording.
 *
 * Note that this is not the event fired when the users tries to start
 * the recording in the UI.
 *
 * @param {bool} isEngaged - Whether local recording is engaged or not.
 * @returns {{
 *     type: LOCAL_RECORDING_ENGAGED
 * }|{
 *     type: LOCAL_RECORDING_UNENGAGED
 * }}
 */
export function signalLocalRecordingEngagement(isEngaged: boolean) {
    return {
        type: isEngaged ? LOCAL_RECORDING_ENGAGED : LOCAL_RECORDING_UNENGAGED
    };
}

/**
 * Toggles the open/close state of {@code LocalRecordingInfoDialog}.
 *
 * @returns {{
 *     type: LOCAL_RECORDING_TOGGLE_DIALOG
 * }}
 */
export function toggleLocalRecordingInfoDialog() {
    return {
        type: LOCAL_RECORDING_TOGGLE_DIALOG
    };
}

/**
 * FIXME: Creates an event that represents a clock tick.
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
 * Updates the the local recording stats from each client,
 * to be displayed on {@code LocalRecordingInfoDialog}.
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
