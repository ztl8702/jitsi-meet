import { RecordingAdapter } from '../RecordingAdapter';
import { downloadBlob, timestampString } from '../Utils';

const logger = require('jitsi-meet-logger').getLogger(__filename);

/**
 * Recording adapter that uses libflac in the background
 */
export class FlacAdapter extends RecordingAdapter {

    _encoder = null;
    _audioContext = null;
    _audioProcessingNode = null;
    _audioSource = null;

    _stopPromiseResolver = null;

    /**
     * Implements {@link RecordingDelegate#ensureInitialized}.
     *
     * @inheritdoc
     */
    ensureInitialized() {
        if (this._encoder !== null) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {

            try {
                this._encoder = new Worker('/libs/flacEncodeWorker.min.js');
            } catch (e) {
                this._encoder = new Worker('/libs/flacEncodeWorker.js');
            }

            this._encoder.onmessage = e => {
                if (e.data.command === 'end') {
                    // receiving blob
                    this._data = e.data.buf;
                    if (this._stopPromiseResolver !== null) {
                        this._stopPromiseResolver();
                        this._stopPromiseResolver = null;
                    }
                } else if (e.data.cmd === 'debug') {
                    logger.log(e.data);
                } else {
                    logger.error(
                        `Unknown event
                        from encoder (WebWorker): "${e.data.command}"!`);
                }
            };

            navigator.getUserMedia(

                // constraints - only audio needed for this app
                {
                    audioBitsPerSecond: 44100, // 44 kbps
                    audio: true,
                    mimeType: 'application/ogg' // useless?
                },

                // Success callback
                stream => {
                    this._audioContext = new AudioContext();
                    this._audioSource
                     = this._audioContext.createMediaStreamSource(stream);
                    this._audioProcessingNode
                      = this._audioContext.createScriptProcessor(4096, 1, 1);
                    this._audioProcessingNode.onaudioprocess = e => {
                        // delegate to web worker
                        const channelLeft = e.inputBuffer.getChannelData(0);

                        this._encoder.postMessage({
                            command: 'encode',
                            buf: channelLeft
                        });
                    };
                    resolve();
                },

                // Error callback
                err => {
                    logger.error(`Error calling getUserMedia(): ${err}`);
                    reject();
                }
            );
        });

    }

    /**
     * Implements {@link RecordingDelegate.start}.
     *
     * @inheritdoc
     */
    start() {
        this._encoder.postMessage({
            command: 'init',
            config: {
                sampleRate: 44100,
                bps: 16
            }
        });

        this._audioSource.connect(this._audioProcessingNode);
        this._audioProcessingNode.connect(this._audioContext.destination);
    }

    /**
     * Implements {@link RecordingDelegate.stop}.
     *
     * @inheritdoc
     */
    stop() {
        return new Promise(resolve => {
            this._audioProcessingNode.onaudioprocess = undefined;
            this._audioProcessingNode.disconnect();
            this._audioSource.disconnect();
            this._stopPromiseResolver = resolve;
            this._encoder.postMessage({
                command: 'finish'
            });
        });
    }

    /**
     * Implements {@link RecordingDelegate.download}.
     *
     * @inheritdoc
     */
    download() {
        if (this._data !== null) {
            const audioURL = window.URL.createObjectURL(this._data);

            downloadBlob(audioURL, `recording${timestampString()}.flac`);
        }

    }
}

