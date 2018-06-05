import { RecordingDelegate } from './RecordingDelegate';
import { RecordingDelegateOgg } from './RecordingDelegateOgg';
import { RecordingDelegateFlac } from './flac/RecordingDelegateFlac';
import { RecordingDelegateWav } from './RecordingDelegateWav';

/**
 * Recoding coordination
 */
export class RecordingController {

    RECORDING_FORMAT = 'wav';

    _delegate: RecordingDelegate = null;

    /**
     * Constructor.
     */
    constructor() {
        console.log('RecordingController: format=', this.RECORDING_FORMAT);

        switch (this.RECORDING_FORMAT) {
        case 'ogg':
            this._delegate = new RecordingDelegateOgg();
            break;
        case 'flac':
            this._delegate = new RecordingDelegateFlac();
            break;
        case 'wav':
            this._delegate = new RecordingDelegateWav();
            break;
        default:
            throw new Error(`Unknown codec: ${this.RECORDING_FORMAT}`);
        }
    }

    /**
     * Signals the start of recording.
     *
     * @returns {void}
     */
    startRecording() {
        this._delegate.start();
    }

    /**
     * Signals the termination of recording.
     *
     * @returns {Promise}
     */
    stopRecording() {
        return this._delegate.stop();
    }

    /**
     * Triggers the download of recorded data.
     * Browser only.
     *
     * @returns {void}
     */
    downloadRecordedData() {
        this._delegate.download();
    }
}
