/* @flow */

import {
    OggAdapter,
    FlacAdapter,
    WavAdapter
} from '../recording';

declare var APP: Object;

const COMMAND_START = 'localRecStart';
const COMMAND_STOP = 'localRecStop';
const COMMAND_CHANGE_CONFIG = 'localRecConfig';
const COMMAND_CLIENT_UPDATE = 'localRecClientUpdate';

const DEFAULT_RECORDING_FORMAT = 'flac';


const ControllerState = Object.freeze({
    IDLE: Symbol('idle'),
    RECORDING: Symbol('recording')
});


/**
 * Recoding coordination, across multiple participants
 */
export class RecordingController {

    _delegates = {};
    _conference: * = null;
    _currentSessionToken: number = -1;
    _state = ControllerState.IDLE;
    _format = DEFAULT_RECORDING_FORMAT;
    onNotify: ?(string) => void = null;
    onWarning: ?(string) => void = null;
    onStateChanged: ?(boolean) => void = null;

    /**
     * Constructor.
     */
    constructor() {
        this._onStartCommand = this._onStartCommand.bind(this);
        this._onStopCommand = this._onStopCommand.bind(this);
        this._doStartRecording = this._doStartRecording.bind(this);
        this._doStopRecording = this._doStopRecording.bind(this);
        this.registerEvents = this.registerEvents.bind(this);
    }

    _registered = false;


    registerEvents: () => void;

    /**
     * Register XMPP events.
     *
     * @returns {void}
     */
    registerEvents() {
        if (!this._registered) {
            this._conference = APP.conference;
            if (this._conference && this._conference.commands) {
                this._conference.commands
                    .addCommandListener(COMMAND_STOP, this._onStopCommand);
                this._conference.commands
                    .addCommandListener(COMMAND_START, this._onStartCommand);
                this._registered = true;
            }
        }
    }

    /**
     * Signals the participants to start local recording.
     *
     * @returns {void}
     */
    startRecording() {
        this.registerEvents();
        if (this._conference && this._conference.isModerator
            && this._conference.commands) {
            this._conference.commands.sendCommandOnce(COMMAND_START, {
                attributes: {
                    sessionToken: this._getRandomToken(),
                    format: this._format
                }
            });
        } else if (this.onWarning) {
            this.onWarning('You are not the moderator. '
            + 'You cannot change recording status.');
        }
    }

    /**
     * Signals the participants to stop local recording.
     *
     * @returns {void}
     */
    stopRecording() {
        if (this._conference) {
            if (this._conference.isModerator) {
                this._conference.commands.sendCommandOnce(COMMAND_STOP, {});
            } else if (this.onWarning) {
                this.onWarning('You are not the moderator. '
                + 'You cannot change recording status.');
            }
        }
    }

    /**
     * Triggers the download of recorded data.
     * Browser only.
     *
     * @param {number} sessionToken - The token of the session to download.
     * @returns {void}
     */
    downloadRecordedData(sessionToken: number) {
        if (this._delegates[sessionToken]) {
            this._delegates[sessionToken].download();
        } else {
            console.error(`Invalid session token for download ${sessionToken}`);
        }
    }

    /**
     * Switches the recording format.
     *
     * @param {string} newFormat - The new format.
     * @returns {void}
     */
    switchFormat(newFormat: string) {
        this._format = newFormat;
        console.log(`Recording format switched to ${newFormat}`);

        // will be used next time
    }

    _onStartCommand: (*) => void;

    /**
     * Callback function for XMPP event.
     *
     * @private
     * @param {*} value - The event args.
     * @returns {void}
     */
    _onStartCommand(value) {
        const { sessionToken, format } = value.attributes;

        if (this._state === ControllerState.IDLE) {
            this._format = format;
            this._currentSessionToken = sessionToken;
            this._delegates[sessionToken]
                 = this._createRecordingDelegate();
            this._doStartRecording();
        } else if (this._currentSessionToken !== sessionToken) {
            // we need to restart the recording
            this._doStopRecording().then(() => {
                this._format = format;
                this._currentSessionToken = sessionToken;
                this._delegates[sessionToken]
                    = this._createRecordingDelegate();
                this._doStartRecording();
            });
        }
    }

    _onStopCommand: (*) => void;

    /**
     * Callback function for XMPP event.
     *
     * @private
     * @param {*} _value - The event args.
     * @returns {void}
     */
    _onStopCommand(/* eslint-disable*/_value/* eslint-enable */) {
        if (this._state === ControllerState.RECORDING) {
            this._doStopRecording();
        }
    }

    /**
     * Generates a token that can be used to distinguish each
     * recording session.
     *
     * @returns {number}
     */
    _getRandomToken() {
        return Math.floor(Math.random() * 10000) + 1;
    }

    _doStartRecording: () => void;

    /**
     * Starts the recording.
     *
     * @private
     * @returns {void}
     */
    _doStartRecording() {
        if (this._state === ControllerState.IDLE) {
            this._state = ControllerState.RECORDING;
            const delegate = this._delegates[this._currentSessionToken];

            delegate.ensureInitialized()
            .then(() => delegate.start())
            .then(() => {
                console.log('Recording starts');
                if (this.onNotify) {
                    this.onNotify('Local recording started.');
                }
                if (this.onStateChanged) {
                    this.onStateChanged(true);
                }
            });

        }
    }

    _doStopRecording: () => Promise<void>;

    /**
     * Stops the recording.
     *
     * @private
     * @returns {Promise<void>}
     */
    _doStopRecording() {
        if (this._state === ControllerState.RECORDING) {
            const token = this._currentSessionToken;

            return this._delegates[this._currentSessionToken]
                .stop()
                .then(() => {
                    this._state = ControllerState.IDLE;
                    console.log('Recording stopped.');
                    this.downloadRecordedData(token);
                    if (this.onNotify) {
                        this.onNotify(`Recording session ${token} finished. `
                        + 'Please send the recorded file to the moderator.');
                    }
                    if (this.onStateChanged) {
                        this.onStateChanged(false);
                    }
                });
        }

        /* eslint-disable */
        return (Promise.resolve(): Promise<void>); 
        // @todo: better ways to satisfy flow
        /* eslint-enable */

    }

    /**
     * Creates recording delegate according to the current format.
     *
     * @private
     * @returns {RecordingDelegate}
     */
    _createRecordingDelegate() {
        console.log('RecordingController: format =', this._format);

        switch (this._format) {
        case 'ogg':
            return new RecordingDelegateOgg();
        case 'flac':
            return new RecordingDelegateFlac();
        case 'wav':
            return new RecordingDelegateWav();
        default:
            throw new Error(`Unknown format: ${this._format}`);
        }
    }
}
