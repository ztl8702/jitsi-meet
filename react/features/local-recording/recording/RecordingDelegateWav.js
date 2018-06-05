import { RecordingDelegate } from './RecordingDelegate';
import { downloadBlob, timestampString } from './Utils';


const WAV_BITS_PER_SAMPLE = 16;
const WAV_SAMPLE_RATE = 44100;


/**
 * Raw wav format recording
 */
export class RecordingDelegateWav extends RecordingDelegate {

    _audioContext = null;
    _audioProcessingNode = null;
    _audioSource = null;

    _wavLength = 0;
    _wavBuffers = [];

    /**
     * Constructor.
     *
     */
    constructor() {
        super();

        navigator.getUserMedia(

            // constraints - only audio needed for this app
            {
                audioBitsPerSecond: WAV_SAMPLE_RATE * WAV_BITS_PER_SAMPLE,
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
                    const channelLeft = e.inputBuffer.getChannelData(0);

                    // https://developer.mozilla.org/en-US/docs/
                    // Web/API/AudioBuffer/getChannelData
                    // the returned value is an Float32Array

                    this._saveWavPCM(channelLeft);
                };
            },

            // Error callback
            err => {
                console.log(`The following gUM error occurred: ${err}`);
            }
        );

        this._saveWavPCM = this._saveWavPCM.bind(this);
    }

    /**
     * Implements {@link RecordingDelegate.start}.
     *
     * @inheritdoc
     */
    start() {

        this._wavBuffers = [];
        this._wavLength = 0;
        this._wavBuffers.push(this._createWavHeader());


        this._audioSource.connect(this._audioProcessingNode);
        this._audioProcessingNode.connect(this._audioContext.destination);
    }

    /**
     * Implements {@link RecordingDelegate.stop}.
     *
     * @inheritdoc
     */
    stop() {
        this._audioProcessingNode.disconnect();
        this._audioSource.disconnect();
        this._data = this._exportMonoWAV(this._wavBuffers, this._wavLength);
        
        return Promise.resolve();
    }

    /**
     * Implements {@link RecordingDelegate.download}.
     *
     * @inheritdoc
     */
    download() {
        if (this._data !== null) {
            const audioURL = window.URL.createObjectURL(this._data);

            console.log('Audio URL:', audioURL);

            downloadBlob(audioURL, `recording${timestampString()}.wav`);
        }

    }

    /**
     * Creates a WAVE file header.
     *
     * @private
     * @returns {Uint8Array}
     */
    _createWavHeader() {
        // adapted from https://github.com/mmig/speech-to-flac/blob/master/encoder.js

        // ref: http://soundfile.sapp.org/doc/WaveFormat/

        // create our WAVE file header
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        writeUTFBytes(view, 0, 'RIFF');

        // set file size at the end
        writeUTFBytes(view, 8, 'WAVE');

        // FMT sub-chunk
        writeUTFBytes(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);

        // NumChannels
        view.setUint16(22, 1, true);

        // SampleRate
        view.setUint32(24, WAV_SAMPLE_RATE, true);

        // ByteRate
        view.setUint32(28,
            Number(WAV_SAMPLE_RATE) * 1 * WAV_BITS_PER_SAMPLE / 8, true);

        // BlockAlign
        view.setUint16(32, 1 * Number(WAV_BITS_PER_SAMPLE) / 8, true);

        view.setUint16(34, WAV_BITS_PER_SAMPLE, true);

        // data sub-chunk
        writeUTFBytes(view, 36, 'data');

        // DUMMY file length (set real value on export)
        view.setUint32(4, 10, true);

        // DUMMY data chunk length (set real value on export)
        view.setUint32(40, 10, true);

        return new Uint8Array(buffer);
    }


    /**
     * Callback function that saves the PCM bits.
     *
     * @private
     * @param {Float32Array} data - The audio PCM data.
     * @returns {void}
     */
    _saveWavPCM(data) {
        // need to copy the Float32Array,
        // unlike passing to WebWorker,
        // this data is passed by reference,
        // so we need to copy it, otherwise the
        // audio file will be just repeating the last
        // segment.
        
        this._wavBuffers.push(new Float32Array(data));
        this._wavLength += data.length;
    }

    /**
     * 
     * @param {*} buffers 
     * @param {*} length 
     */
    _exportMonoWAV(buffers, length) {
        // buffers: array with
        //  buffers[0] = header information (with missing length information)
        //  buffers[1] = Float32Array object (audio data)
        //  ...
        //  buffers[n] = Float32Array object (audio data)

        const dataLength = length * 2; // why multiply by 2 here?
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);

        // copy WAV header data into the array buffer
        const header = buffers[0];
        const len = header.length;

        for (let i = 0; i < len; ++i) {
            view.setUint8(i, header[i]);
        }

        // add file length in header
        view.setUint32(4, 32 + dataLength, true);

        // add data chunk length in header
        view.setUint32(40, dataLength, true);

        // write audio data
        floatTo16BitPCM(view, 44, buffers);

        return new Blob([ view ], { type: 'audio/wav' });
    }
}


/**
 * Helper function. Writes a UTF string to memory
 * using big endianness. Required by WAVE headers.
 *
 * @param {ArrayBuffer} view - The view to memory.
 * @param {*} offset - Offset.
 * @param {*} string - The string to be written.
 * @returns {void}
 */
function writeUTFBytes(view, offset, string) {
    const lng = string.length;

    // big endianness
    for (let i = 0; i < lng; ++i) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * 
 * @param {*} output 
 * @param {*} offset 
 * @param {*} inputBuffers 
 */
function floatTo16BitPCM(output, offset, inputBuffers) {

    let input, jsize = inputBuffers.length, isize, i, s;

    // first entry is header information (already used in exportMonoWAV),
    // rest is Float32Array-entries -> ignore header entry
    for (let j = 1; j < jsize; ++j) {
        input = inputBuffers[j];
        isize = input.length;
        for (i = 0; i < isize; ++i, offset += 2) {
            s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }
}
