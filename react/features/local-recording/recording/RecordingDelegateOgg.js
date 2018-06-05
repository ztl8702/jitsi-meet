import { RecordingDelegate } from './RecordingDelegate';
import { downloadBlob, timestampString } from './Utils';

/**
 * Using mediaRecorder (default browser encoding ogg)
 */
export class RecordingDelegateOgg extends RecordingDelegate {

    _mediaRecorder = null;

    /**
     * Ensure that the MediaRecorder has been initialized.
     *
     * @returns {Promise}
     */
    _ensureInitialized() {
        let p = null;

        if (this._mediaRecorder === null) {
            p = new Promise((resolve, error) => {
                navigator.getUserMedia(

                    // constraints - only audio needed for this app
                    {
                        audioBitsPerSecond: 44100, // 44 kbps
                        audio: true,
                        mimeType: 'application/ogg'
                    },

                    // Success callback
                    stream => {
                        // myAudioStream = stream;
                        this._mediaRecorder = new MediaRecorder(stream);
                        this._mediaRecorder.ondataavailable = e => this._saveMediaData(e.data);
                        resolve();
                    },

                    // Error callback
                    err => {
                        console.log(`The following gUM error occurred: ${err}`);
                        error();
                    }
                );
            });
        } else {
            p = new Promise(resolve => {
                resolve();
            });
        }

        return p;
    }

    /**
     * Implements {@link RecordingDelegate.start}.
     *
     * @inheritdoc
     */
    start() {
        this._ensureInitialized().then(() => this._mediaRecorder.start());
    }

    /**
     * Implements {@link RecordingDelegate.stop}.
     *
     * @inheritdoc
     */
    stop() {
        return new Promise(
            resolve => {
                this._mediaRecorder.onstop = () => resolve();
                this._mediaRecorder.stop();
            }
        );
    }

    /**
     * Implements {@link RecordingDelegate.download}.
     *
     * @inheritdoc
     */
    download() {
        if (this._recordedData !== null) {
            const audioURL = window.URL.createObjectURL(this._recordedData);

            console.log('Audio URL:', audioURL);
            downloadBlob(audioURL, `recording${timestampString()}.ogg`);
        }

    }

    /**
     * Callback for encoded data.
     *
     * @private
     * @param {*} data - Encoded data.
     * @returns {void}
     */
    _saveMediaData(data) {
        this._recordedData = data;
    }
}
