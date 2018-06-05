const RECORDING_FORMAT = 'ogg';

/**
 * Common interface for recording mechanisms
 */
class RecordingDelegate {
    /**
     * Starts recording.
     *
     * @returns {Promise}
     */
    start() {
        throw new Error('Not implemented');
    }

    /**
     * Stops recording.
     *
     * @returns {Promise}
     */
    stop() {
        throw new Error('Not implemented');
    }

    /**
     * Initiates download.
     *
     * @returns {void}
     */
    download() {
        throw new Error('Not implemented');

    }
}

/**
 * Using mediaRecorder (default browser encoding ogg)
 */
class RecordingDelegateOgg extends RecordingDelegate {

    _mediaRecorder = null;

    /**
     * Constructor
     */
    constructor() {
        super();
    }

    /**
     * Ensure that the MediaRecorder has been initialized.
     *
     * @returns {Promise}
     */
    _ensureInitialized() {
        var p = null;
        if (this._mediaRecorder !== null) {
            p = new Promise(resolve => {
                resolve();
            });
        } else {
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
            })
        }
        return p;

    }

    /**
     * @inheritDoc
     */
    start() {
        this._ensureInitialized().then(() => this._mediaRecorder.start());
    }

    /**
     * @returns {Promise}
     */
    stop() {
        return new Promise(
            resolve => {
                this._mediaRecorder.onstop = () => resolve();
                this._mediaRecorder.stop();
            }
        )
    }

    download() {
        if (this._recordedData != null) {
            const audioURL = window.URL.createObjectURL(data);

            console.log('Audio URL:', audioURL);

            // fake a anchor tag
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none';
            a.href = audioURL;
            a.download = 'recording.ogg';
            a.click();
        }

    }

    _saveMediaData(data) {
        this._recordedData = data;
    }
}

/**
 * Uses libflac in the background
 */
class RecordingDelegateFlac extends RecordingDelegate {

    _encoder = null;
    _audioContext = null;
    _audioProcessingNode = null;
    _audioSource = null;

    /**
     * Constructor.
     *
     */
    constructor() {
        super();
        this._encoder = new Worker('flacEncodeWorker.js');
        this._encoder.onmessage = e => {
            if (e.data.command === 'end') {
                // receiving blob
                this._data = e.data.buf;
            } else if (e.data.cmd === 'debug') {
                console.log(e.data);
            } else {
                console.error(
                    `Unknown event
                    from encoder (WebWorker): "${e.data.command}"!`);
            }
        };

        navigator.getUserMedia(

            // constraints - only audio needed for this app
            {
                audioBitsPerSecond: 44100, // 44 kbps
                audio: true,
                mimeType: 'application/ogg'
            },

            // Success callback
            stream => {
                // this._mediaRecorder = new MediaRecorder(stream);
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
            },

            // Error callback
            err => {
                console.log(`The following gUM error occurred: ${err}`);
            }
        );
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
                bps: 96
            }
        });
    }

    /**
     * Implements {@link RecordingDelegate.stop}.
     *
     * @inheritdoc
     */
    stop() {
        this._encoder.postMessage({
            command: 'finish'
        });
    }

    download() {
        if (this._data != null) {
            const audioURL = window.URL.createObjectURL(data);

            console.log('Audio URL:', audioURL);

            // fake a anchor tag
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none';
            a.href = audioURL;
            a.download = 'recording.flac';
            a.click();
        }

    }
}


/**
 * Recoding coordination
 */
export class RecordingController {

    _delegate: RecordingDelegate = null;

    /**
     * Constructor.
     */
    constructor() {
        switch (RECORDING_FORMAT) {
        case 'ogg':
            this._delegate = new RecordingDelegateOgg();
            break;
        case 'flac':
            this._delegate = new RecordingDelegateFlac();
            break;
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
