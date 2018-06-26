import {
    OggAdapter,
    FlacAdapter,
    WavAdapter,
    RecordingAdapter
} from '../recording';


const COMMAND_START = 'localRecStart';
const COMMAND_STOP = 'localRecStop';

const DEFAULT_RECORDING_FORMAT = 'flac';


const ControllerState = Object.freeze({
    IDLE: Symbol('idle'),
    RECORDING: Symbol('recording')
});

declare var APP: object;

/**
 * Recoding coordination, across multiple participants
 */
export class RecordingController {

    _delegates = {};
    _conference = null;
    _currentSessionToken = -1;
    _state = ControllerState.IDLE;
    _format = DEFAULT_RECORDING_FORMAT;
    onNotify = null;
    onWarning = null;
    onStateChanged = null;

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

    /**
     * 
     */
    registerEvents() {
        if (!this._registered) {
            this._conference = APP.conference;
            if (this._conference !== null) {
                this._conference.commands.addCommandListener(COMMAND_START, this._onStartCommand);
                this._conference.commands.addCommandListener(COMMAND_STOP, this._onStopCommand);
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
        if (this._conference.isModerator) {
            this._conference.commands.sendCommandOnce(COMMAND_START, {
                attributes: {
                    sessionToken: this._getRandomToken(),
                    format: this._format
                }
                
            });
        } else {
            this.onWarning('You are not the moderator.'
            + 'You cannot change recording status.');
        }
    }

    /**
     * Signals the participants to stop local recording.
     *
     * @returns {void}
     */
    stopRecording() {
        if (this._conference.isModerator) {
            this._conference.commands.sendCommandOnce(COMMAND_STOP, {});
        } else {
            this.onWarning('You are not the moderator.'
            + 'You cannot change recording status.');
        }
    }

    /**
     * Triggers the download of recorded data.
     * Browser only.
     *
     * @param {*} sessionToken - The token of the session to download.
     * @returns {void}
     */
    downloadRecordedData(sessionToken) {
        if (this._delegates[sessionToken]) {
            this._delegates[sessionToken].download();
        } else {
            console.error(`Invalid session token for download ${sessionToken}`);
        }
    }

    /**
     * Switches the recording format.
     *
     * @param {*} newFormat - The new format.
     * @returns {void}
     */
    switchFormat(newFormat) {
        this._format = newFormat;
        console.log(`Recording format switched to ${newFormat}`);

        // will be used next time
    }

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
            this._delegates[sessionToken] =
                this._createRecordingDelegate();
            this._doStartRecording();
        } else if (this._currentSessionToken !== sessionToken) {
            // we need to restart the recording
            this._doStopRecording().then(() => {
                this._format = format;
                this._currentSessionToken = sessionToken;
                this._delegates[sessionToken] =
                    this._createRecordingDelegate();
                this._doStartRecording();
            });
        }
    }

    /**
     * Callback function for XMPP event.
     *
     * @private
     * @param {*} _value - The event args.
     * @returns {void}
     */
    _onStopCommand(_value) {
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
                this.onNotify('Local recording started.');
                if (this.onStateChanged) {
                    this.onStateChanged(true);
                }
            });

        }
    }

    /**
     * Stops the recording.
     *
     * @private
     * @returns {Promise}
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
                    this.onNotify(`Recording session ${token} finished. `
                        + 'Please send the recorded file to the moderator.');
                    if (this.onStateChanged) {
                        this.onStateChanged(false);
                    }
                });
        }

        return Promise.resolve();

    }

    /**
     * Creates recording delegate according to the current format.
     *
     * @private
     * @returns {RecordingAdapter}
     */
    _createRecordingDelegate() {
        console.log('RecordingController: format =', this._format);

        switch (this._format) {
        case 'ogg':
            return new OggAdapter();
        case 'flac':
            return new FlacAdapter();
        case 'wav':
            return new WavAdapter();
        default:
            throw new Error(`Unknown format: ${this._format}`);
        }
    }
}
