/* global APP, config, interfaceConfig */
/*
 * Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const logger = require('jitsi-meet-logger').getLogger(__filename);

import UIEvents from '../../../service/UI/UIEvents';
import UIUtil from '../util/UIUtil';
import VideoLayout from '../videolayout/VideoLayout';

import { openDialog } from '../../../react/features/base/dialog';
import {
    JitsiRecordingStatus
} from '../../../react/features/base/lib-jitsi-meet';
import {
    createToolbarEvent,
    createRecordingDialogEvent,
    sendAnalytics
} from '../../../react/features/analytics';
import { setToolboxEnabled } from '../../../react/features/toolbox';
import { setNotificationsEnabled } from '../../../react/features/notifications';
import {
    StartLiveStreamDialog,
    StopLiveStreamDialog,
    hideRecordingLabel,
    setRecordingType,
    updateRecordingState
} from '../../../react/features/recording';

/**
 * Translation keys to use for display in the UI when recording the conference
 * but not streaming live.
 *
 * @private
 * @type {Object}
 */
export const RECORDING_TRANSLATION_KEYS = {
    failedToStartKey: 'recording.failedToStart',
    recordingBusy: 'recording.busy',
    recordingBusyTitle: 'recording.busyTitle',
    recordingButtonTooltip: 'recording.buttonTooltip',
    recordingErrorKey: 'recording.error',
    recordingOffKey: 'recording.off',
    recordingOnKey: 'recording.on',
    recordingPendingKey: 'recording.pending',
    recordingTitle: 'dialog.recording',
    recordingUnavailable: 'recording.unavailable',
    recordingUnavailableParams: '$t(recording.serviceName)',
    recordingUnavailableTitle: 'recording.unavailableTitle'
};

/**
 * Translation keys to use for display in the UI when the recording mode is
 * currently streaming live.
 *
 * @private
 * @type {Object}
 */
export const STREAMING_TRANSLATION_KEYS = {
    failedToStartKey: 'liveStreaming.failedToStart',
    recordingBusy: 'liveStreaming.busy',
    recordingBusyTitle: 'liveStreaming.busyTitle',
    recordingButtonTooltip: 'liveStreaming.buttonTooltip',
    recordingErrorKey: 'liveStreaming.error',
    recordingOffKey: 'liveStreaming.off',
    recordingOnKey: 'liveStreaming.on',
    recordingPendingKey: 'liveStreaming.pending',
    recordingTitle: 'dialog.liveStreaming',
    recordingUnavailable: 'recording.unavailable',
    recordingUnavailableParams: '$t(liveStreaming.serviceName)',
    recordingUnavailableTitle: 'liveStreaming.unavailableTitle'
};

/**
 * The dialog for user input.
 */
let dialog = null;

/**
 * Indicates if the recording button should be enabled.
 *
 * @returns {boolean} {true} if the
 * @private
 */
function _isRecordingButtonEnabled() {
    return (
        interfaceConfig.TOOLBAR_BUTTONS.indexOf('recording') !== -1
            && config.enableRecording
            && APP.conference.isRecordingSupported());
}

/**
 * Request live stream token from the user.
 * @returns {Promise}
 */
function _requestLiveStreamId() {
    return new Promise((resolve, reject) =>
        APP.store.dispatch(openDialog(StartLiveStreamDialog, {
            onCancel: reject,
            onSubmit: resolve
        })));
}

/**
 * Request recording token from the user.
 * @returns {Promise}
 */
function _requestRecordingToken() {
    const titleKey = 'dialog.recordingToken';
    const msgString
        = `<input name="recordingToken" type="text"
                data-i18n="[placeholder]dialog.token"
                class="input-control"
                autofocus>`

    ;


    return new Promise((resolve, reject) => {
        dialog = APP.UI.messageHandler.openTwoButtonDialog({
            titleKey,
            msgString,
            leftButtonKey: 'dialog.Save',
            submitFunction(e, v, m, f) { // eslint-disable-line max-params
                if (v && f.recordingToken) {
                    resolve(UIUtil.escapeHtml(f.recordingToken));
                } else {
                    reject(APP.UI.messageHandler.CANCEL);
                }
            },
            closeFunction() {
                dialog = null;
            },
            focus: ':input:first'
        });
    });
}

/**
 * Shows a prompt dialog to the user when they have toggled off the recording.
 *
 * @param recordingType the recording type
 * @returns {Promise}
 * @private
 */
function _showStopRecordingPrompt(recordingType) {
    if (recordingType === 'jibri') {
        return new Promise((resolve, reject) => {
            APP.store.dispatch(openDialog(StopLiveStreamDialog, {
                onCancel: reject,
                onSubmit: resolve
            }));
        });
    }

    return new Promise((resolve, reject) => {
        dialog = APP.UI.messageHandler.openTwoButtonDialog({
            titleKey: 'dialog.recording',
            msgKey: 'dialog.stopRecordingWarning',
            leftButtonKey: 'dialog.stopRecording',
            submitFunction: (e, v) => (v ? resolve : reject)(),
            closeFunction: () => {
                dialog = null;
            }
        });
    });
}

/**
 * Checks whether if the given status is either PENDING or RETRYING
 * @param status {JitsiRecordingStatus} Jibri status to be checked
 * @returns {boolean} true if the condition is met or false otherwise.
 */
function isStartingStatus(status) {
    return (
        status === JitsiRecordingStatus.PENDING
            || status === JitsiRecordingStatus.RETRYING
    );
}

/**
 * Manages the recording user interface and user experience.
 * @type {{init, updateRecordingState, updateRecordingUI, checkAutoRecord}}
 */
const Recording = {
    /**
     * Initializes the recording UI.
     */
    init(eventEmitter, recordingType) {
        this.eventEmitter = eventEmitter;
        this.recordingType = recordingType;

        APP.store.dispatch(setRecordingType(recordingType));

        this.updateRecordingState(APP.conference.getRecordingState());

        if (recordingType === 'jibri') {
            this.baseClass = 'fa fa-play-circle';
            Object.assign(this, STREAMING_TRANSLATION_KEYS);
        } else {
            this.baseClass = 'icon-recEnable';
            Object.assign(this, RECORDING_TRANSLATION_KEYS);
        }

        this.eventEmitter.on(UIEvents.TOGGLE_RECORDING,
            () => this._onToolbarButtonClick());

        // If I am a recorder then I publish my recorder custom role to notify
        // everyone.
        if (config.iAmRecorder) {
            VideoLayout.enableDeviceAvailabilityIcons(
                APP.conference.getMyUserId(), false);

            // in case of iAmSipGateway keep local video visible
            if (!config.iAmSipGateway) {
                VideoLayout.setLocalVideoVisible(false);
            }

            APP.store.dispatch(setToolboxEnabled(false));
            APP.store.dispatch(setNotificationsEnabled(false));
            APP.UI.messageHandler.enablePopups(false);
        }
    },

    /**
     * Updates the recording state UI.
     * @param recordingState gives us the current recording state
     */
    updateRecordingState(recordingState) {
        // I'm the recorder, so I don't want to see any UI related to states.
        if (config.iAmRecorder) {
            return;
        }

        // If there's no state change, we ignore the update.
        if (!recordingState || this.currentState === recordingState) {
            return;
        }

        this.updateRecordingUI(recordingState);
    },

    /**
     * Sets the state of the recording button.
     * @param recordingState gives us the current recording state
     */
    updateRecordingUI(recordingState) {

        const oldState = this.currentState;

        this.currentState = recordingState;

        let labelDisplayConfiguration;
        let isRecording = false;

        switch (recordingState) {
        case JitsiRecordingStatus.ON:
        case JitsiRecordingStatus.RETRYING: {
            labelDisplayConfiguration = {
                centered: false,
                key: this.recordingOnKey,
                showSpinner: recordingState === JitsiRecordingStatus.RETRYING
            };

            isRecording = true;

            break;
        }

        case JitsiRecordingStatus.OFF:
        case JitsiRecordingStatus.BUSY:
        case JitsiRecordingStatus.FAILED:
        case JitsiRecordingStatus.UNAVAILABLE: {
            const wasInStartingStatus = isStartingStatus(oldState);

            // We don't want UI changes if this is an availability change.
            if (oldState !== JitsiRecordingStatus.ON && !wasInStartingStatus) {
                APP.store.dispatch(updateRecordingState({ recordingState }));

                return;
            }

            labelDisplayConfiguration = {
                centered: true,
                key: wasInStartingStatus
                    ? this.failedToStartKey
                    : this.recordingOffKey
            };

            setTimeout(() => {
                APP.store.dispatch(hideRecordingLabel());
            }, 5000);

            break;
        }

        case JitsiRecordingStatus.PENDING: {
            labelDisplayConfiguration = {
                centered: true,
                key: this.recordingPendingKey
            };

            break;
        }

        case JitsiRecordingStatus.ERROR: {
            labelDisplayConfiguration = {
                centered: true,
                key: this.recordingErrorKey
            };

            break;
        }

        // Return an empty label display configuration to indicate no label
        // should be displayed. The JitsiRecordingStatus.AVAIABLE case is
        // handled here.
        default: {
            labelDisplayConfiguration = null;
        }
        }

        APP.store.dispatch(updateRecordingState({
            isRecording,
            labelDisplayConfiguration,
            recordingState
        }));
    },

    // checks whether recording is enabled and whether we have params
    // to start automatically recording (XXX: No, it doesn't do that).
    checkAutoRecord() {
        if (_isRecordingButtonEnabled && config.autoRecord) {
            this.predefinedToken = UIUtil.escapeHtml(config.autoRecordToken);
            this.eventEmitter.emit(
                UIEvents.RECORDING_TOGGLED,
                { token: this.predefinedToken });
        }
    },

    /**
     * Handles {@code click} on {@code toolbar_button_record}.
     *
     * @returns {void}
     */
    _onToolbarButtonClick() {
        sendAnalytics(createToolbarEvent(
            'recording.button',
            {
                'dialog_present': Boolean(dialog)
            }));

        if (dialog) {
            return;
        }

        switch (this.currentState) {
        case JitsiRecordingStatus.ON:
        case JitsiRecordingStatus.RETRYING:
        case JitsiRecordingStatus.PENDING: {
            _showStopRecordingPrompt(this.recordingType).then(
                () => {
                    this.eventEmitter.emit(UIEvents.RECORDING_TOGGLED);

                    // The confirm button on the stop recording dialog was
                    // clicked
                    sendAnalytics(
                        createRecordingDialogEvent(
                            'stop',
                            'confirm.button'));
                },
                () => {}); // eslint-disable-line no-empty-function
            break;
        }
        case JitsiRecordingStatus.AVAILABLE:
        case JitsiRecordingStatus.OFF: {
            if (this.recordingType === 'jibri') {
                _requestLiveStreamId()
                .then(streamId => {
                    this.eventEmitter.emit(
                        UIEvents.RECORDING_TOGGLED,
                        { streamId });

                    // The confirm button on the start recording dialog was
                    // clicked
                    sendAnalytics(
                        createRecordingDialogEvent(
                            'start',
                            'confirm.button'));
                })
                .catch(reason => {
                    if (reason === APP.UI.messageHandler.CANCEL) {
                        // The cancel button on the start recording dialog was
                        // clicked
                        sendAnalytics(
                            createRecordingDialogEvent(
                                'start',
                                'cancel.button'));
                    } else {
                        logger.error(reason);
                    }
                });
            } else {
                // Note that we only fire analytics events for Jibri.
                if (this.predefinedToken) {
                    this.eventEmitter.emit(
                        UIEvents.RECORDING_TOGGLED,
                        { token: this.predefinedToken });

                    return;
                }

                _requestRecordingToken().then(token => {
                    this.eventEmitter.emit(
                        UIEvents.RECORDING_TOGGLED,
                        { token });
                })
                .catch(reason => {
                    if (reason !== APP.UI.messageHandler.CANCEL) {
                        logger.error(reason);
                    }
                });
            }
            break;
        }
        case JitsiRecordingStatus.BUSY: {
            APP.UI.messageHandler.showWarning({
                descriptionKey: this.recordingBusy,
                titleKey: this.recordingBusyTitle
            });
            break;
        }
        default: {
            APP.UI.messageHandler.showError({
                descriptionKey: this.recordingUnavailable,
                descriptionArguments: {
                    serviceName: this.recordingUnavailableParams },
                titleKey: this.recordingUnavailableTitle
            });
        }
        }
    }
};

export default Recording;
