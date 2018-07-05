/* @flow */

import {
    OggAdapter,
    FlacAdapter,
    WavAdapter
} from '../recording';

const logger = require('jitsi-meet-logger').getLogger(__filename);

/**
 * XMPP command for signaling the start of local recording to all clients.
 * Should be sent by the moderator only.
 */
const COMMAND_START = 'localRecStart';

/**
 * XMPP command for signaling the stop of local recording to all clients.
 * Should be sent by the moderator only.
 */
const COMMAND_STOP = 'localRecStop';

/**
 * Participant property key for local recording stats.
 */
const PROPERTY_STATS = 'localRecStats';

/**
 * Default recording format.
 */
const DEFAULT_RECORDING_FORMAT = 'flac';


const ControllerState = Object.freeze({
    IDLE: Symbol('idle'),
    RECORDING: Symbol('recording')
});

/**
 * Type of the stats reported by each client.
 */
type RecordingStats = {
    currentSessionToken: number,
    isRecording: boolean,
    recordedBytes: number,
    recordedLength: number
}

/**
 * Recoding coordination, across multiple participants
 */
class RecordingController {

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
     *
     * @returns {void}
     */
    constructor() {
        this._updateStats = this._updateStats.bind(this);
        this._onStartCommand = this._onStartCommand.bind(this);
        this._onStopCommand = this._onStopCommand.bind(this);
        this._doStartRecording = this._doStartRecording.bind(this);
        this._doStopRecording = this._doStopRecording.bind(this);
        this.registerEvents = this.registerEvents.bind(this);
        this.getParticipantsStats = this.getParticipantsStats.bind(this);
    }

    _registered = false;


    registerEvents: () => void;

    /**
     * Registers listeners for XMPP events.
     *
     * @param {JitsiConference} conference - JitsiConference instance.
     * @returns {void}
     */
    registerEvents(conference: Object) {
        if (!this._registered) {
            this._conference = conference;
            if (this._conference) {
                this._conference
                    .addCommandListener(COMMAND_STOP, this._onStopCommand);
                this._conference
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
        if (this._conference && this._conference.isModerator()) {
            this._conference.removeCommand(COMMAND_STOP);
            this._conference.sendCommand(COMMAND_START, {
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
                this._conference.removeCommand(COMMAND_START);
                this._conference.sendCommand(COMMAND_STOP, {
                    attributes: {
                        sessionToken: this._currentSessionToken
                    }
                });
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
            logger.error(`Invalid session token for download ${sessionToken}`);
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
        logger.log(`Recording format switched to ${newFormat}`);

        // will be used next time
    }

    /**
     * Returns the local recording stats.
     *
     * @returns {RecordingStats}
     */
    getLocalStats(): RecordingStats {
        return {
            currentSessionToken: this._currentSessionToken,
            isRecording: this._state === ControllerState.RECORDING,
            recordedBytes: 0,
            recordedLength: 0
        };
    }

    getParticipantsStats: () => *;

    /**
     * Returns the remote participants' local recording stats.
     *
     * @returns {*}
     */
    getParticipantsStats() {
        const members
            = this._conference.getParticipants()
            .map(member => {
                return {
                    id: member.getId(),
                    displayName: member.getDisplayName(),
                    recordingStats:
                        JSON.parse(member.getProperty(PROPERTY_STATS) || '{}'),
                    isSelf: false
                };
            });

        // transform into a dictionary,
        // for consistent ordering
        const result = {};

        for (let i = 0; i < members.length; ++i) {
            result[members[i].id] = members[i];
        }
        const localId = this._conference.myUserId();

        result[localId] = {
            id: localId,
            displayName: 'local user',
            recordingStats: this.getLocalStats(),
            isSelf: true
        };

        return result;
    }

    _updateStats: () => void;

    /**
     * Sends out updates about the local recording stats via XMPP.
     *
     * @private
     * @returns {void}
     */
    _updateStats() {
        if (this._conference) {
            this._conference.setLocalParticipantProperty(PROPERTY_STATS,
                JSON.stringify(this.getLocalStats()));
        }
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
     * @param {*} value - The event args.
     * @returns {void}
     */
    _onStopCommand(value) {
        if (this._state === ControllerState.RECORDING
            && this._currentSessionToken === value.attributes.sessionToken) {
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
                logger.log('Local recording engaged.');
                if (this.onNotify) {
                    this.onNotify('Local recording started.');
                }
                if (this.onStateChanged) {
                    this.onStateChanged(true);
                }
                this._updateStats();
            });

            // @todo catch

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
                    logger.log('Local recording unengaged.');
                    this.downloadRecordedData(token);
                    if (this.onNotify) {
                        this.onNotify(`Recording session ${token} finished. `
                        + 'Please send the recorded file to the moderator.');
                    }
                    if (this.onStateChanged) {
                        this.onStateChanged(false);
                    }
                    this._updateStats();
                });

            // @ todo catch
        }

        /* eslint-disable */
        return (Promise.resolve(): Promise<void>); 
        // @todo: better ways to satisfy flow
        /* eslint-enable */

    }

    /**
     * Creates recording adapter according to the current format.
     *
     * @private
     * @returns {RecordingAdapter}
     */
    _createRecordingAdapter() {
        logger.trace('[RecordingController] creating recording'
            + ` adapter for ${this._format} format.`);

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

export const recordingController = new RecordingController();
