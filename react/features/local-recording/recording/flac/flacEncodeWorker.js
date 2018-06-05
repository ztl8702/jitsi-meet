/**
 * WebWorker that does FLAC encoding using libflac.js
 *
 * This file does not go through webpack.
 */

importScripts('/libs/libflac3-1.3.2.min.js');


const FLAC_ERRORS = {
    0: 'FLAC__STREAM_ENCODER_OK', // The encoder is in the normal OK state and
    // samples can be processed.
    1: 'FLAC__STREAM_ENCODER_UNINITIALIZED', // The encoder is in the
    // uninitialized state one of the FLAC__stream_encoder_init_*() functions
    // must be called before samples can be processed.
    2: 'FLAC__STREAM_ENCODER_OGG_ERROR', // An error occurred in the underlying
    // Ogg layer.
    3: 'FLAC__STREAM_ENCODER_VERIFY_DECODER_ERROR', // An error occurred in the
    // underlying verify stream decoder; check
    // FLAC__stream_encoder_get_verify_decoder_state().
    4: 'FLAC__STREAM_ENCODER_VERIFY_MISMATCH_IN_AUDIO_DATA', // The verify
    // decoder detected a mismatch between the original audio signal and
    // the decoded audio signal.
    5: 'FLAC__STREAM_ENCODER_CLIENT_ERROR', // One of the callbacks returned
    // a fatal error.
    6: 'FLAC__STREAM_ENCODER_IO_ERROR', // An I/O error occurred while
    // opening/reading/writing a file. Check errno.
    7: 'FLAC__STREAM_ENCODER_FRAMING_ERROR', // An error occurred while writing
    // the stream; usually, the write_callback returned an error.
    8: 'FLAC__STREAM_ENCODER_MEMORY_ALLOCATION_ERROR' // Memory allocation
    // failed.
};

const EncoderState = Object.freeze({
    UNINTIALISED: Symbol('uninitialised'),
    WORKING: Symbol('working'),
    FINISHED: Symbol('finished')
});

/**
 * Concat multiple Uint8Arrays into one.
 *
 * @param {Array} arrays - Array of Uint8 arrays.
 * @param {*} totalLength - Total length of all Uint8Arrays.
 * @returns {Uint8Array}
 */
function mergeUint8Arrays(arrays, totalLength) {
    const result = new Uint8Array(totalLength);
    let offset = 0;
    const len = arrays.length;

    for (let i = 0; i < len; i++) {
        const buffer = arrays[i];

        result.set(buffer, offset);
        offset += buffer.length;
    }

    return result;
}

/**
 * Wrapper class around libflac API.
 */
class Encoder {

    /**
     * Flac encoder instance ID. (As per libflac.js API)
     * @private
     */
    _encoderId = 0;

    /**
     * Sample rate
     * @private
     */
    _sampleRate;

    /**
     * Bit depth (bits per sample)
     * @private
     */
    _bitDepth;

    /**
     * Buffer size
     * @private
     */
    _bufferSize;

    _flacBuffers = [];

    _flacLength = 0;

    _state = EncoderState.UNINTIALISED;

    _data = null;


    /**
     * Constructor.
     * Note: only create instance when Flac.isReady() returns true.
     *
     * @param {number} sampleRate - Sample rate of the raw audio data.
     * @param {number} bitDepth - Bit depth (bit per sample).
     * @param {number} bufferSize - The size of each batch.
     */
    constructor(sampleRate, bitDepth = 16, bufferSize = 4096) {
        if (!Flac.isReady()) {
            throw new Error('libflac is not ready yet!');
        }

        this._sampleRate = sampleRate;
        this._bitDepth = bitDepth;
        this._bufferSize = bufferSize;

        // create the encoder
        this._encoderId = Flac.init_libflac_encoder(
            this._sampleRate,
            1, // Mono channel
            this._bitDepth,
            5, // Compression level TODO: change this later
            0, // Unknown total samples,
            true, // Checksum TODO: i don't know what this is
            0 // Auto determine block size (samples per frame)
        );

        if (this._encoderId === 0) {
            throw new Error('Failed to create libflac encoder.');
        }

        // initialise the encoder
        const initResult = Flac.init_encoder_stream(
            this._encoderId,
            this._onEncodedData.bind(this),
            this._onMetadataAvailable.bind(this)
        );

        if (initResult !== 0) {
            throw new Error('Failed to initalise libflac encoder.');
        }

        this._state = EncoderState.WORKING;
    }

    /**
     * Receive and encode new data.
     *
     * @param {*} audioData - Raw audio data.
     * @returns {void}
     */
    encode(audioData) {
        if (this._state !== EncoderState.WORKING) {
            throw new Error('Encoder is not ready or has finished.');
        }

        if (!Flac.isReady()) {
            throw new Error('Flac not ready');
        }
        const bufferLength = audioData.length;

        // convert to Uint32,
        // appearantly libflac requires 32-bit signed integer input
        // but why unsigned 32bit array?
        const bufferI32 = new Int32Array(bufferLength);
        const view = new DataView(bufferI32.buffer);
        const volume = 1;
        let index = 0;

        for (let i = 0; i < bufferLength; i++) {
            view.setInt32(index, audioData[i] * (0x7FFF * volume), true);
            index += 4; // 4 bytes (32bit)
        }

        // pass it to libflac
        const status = Flac.FLAC__stream_encoder_process_interleaved(
            this._encoderId,
            bufferI32,
            bufferI32.length
        );

        if (status !== true) {
            // get error

            const errorNo
                = Flac.FLAC__stream_encoder_get_state(this._encoderId);

            console.error('Error during encoding', FLAC_ERRORS[errorNo]);
        }
    }

    /**
     * Signals the termination of encoding.
     *
     * @returns {void}
     */
    finish() {
        if (this._state === EncoderState.WORKING) {
            this._state = EncoderState.FINISHED;

            const status = Flac.FLAC__stream_encoder_finish(this._encoderId);

            console.log('flac finish: ', status);

            // free up resources
            Flac.FLAC__stream_encoder_delete(this._encoderId);

            this._data = this._exportFlacBlob();
        }
    }

    /**
     * Gets the stats.
     *
     * @returns {Object}
     */
    getStats() {
        return {
            'samplesEncoded': this._bufferSize
        };
    }

    /**
     * Gets the encoded flac file.
     *
     * @returns {Blob} - The encoded flac file.
     */
    getBlob() {
        if (this._state === EncoderState.FINISHED) {
            return this._data;
        }

        return null;
    }

    /**
     * Converts flac buffer to a Blob.
     *
     * @private
     * @returns {void}
     */
    _exportFlacBlob() {
        const samples = mergeUint8Arrays(this._flacBuffers, this._flacLength);

        const blob = new Blob([ samples ], { type: 'audio/flac' });

        return blob;
    }

    /**
     * Callback function for saving encoded Flac data.
     * This is invoked by libflac.
     *
     *
     * @private
     * @param {*} buffer - The encoded Flac data.
     * @param {*} bytes - Number of bytes in the data.
     * @returns {void}
     */
    _onEncodedData(buffer, bytes) {
        this._flacBuffers.push(buffer);
        this._flacLength += buffer.byteLength;
    }

    /**
     * Callback function for receiving metadata.
     *
     * @private
     * @returns {void}
     */
    _onMetadataAvailable = () => {
        // do nothing
    }
}


let encoder = null;

self.onmessage = function(e) {

    switch (e.data.command) {
    case 'init':
    {
        const bps = e.data.config.bps;
        const sampleRate = e.data.config.sampleRate;

        if (Flac.isReady()) {
            encoder = new Encoder(sampleRate, bps);
        } else {
            Flac.onready = function() {
                setTimeout(() => {
                    encoder = new Encoder(sampleRate, bps);
                }, 0);
            };
        }
        break;
    }

    case 'encode':
        if (encoder === null) {
            console
                .error('flacEncoderWorker:'
                + 'received data when the encoder is not ready.');
        } else {
            encoder.encode(e.data.buf);
        }
        break;

    case 'finish':
        if (encoder !== null) {
            encoder.finish();
            const data = encoder.getBlob();

            self.postMessage(
                {
                    command: 'end',
                    buf: data
                }
            );
            encoder = null;
        }
        break;
    }
};

/**
 * if(wavBuffers.length > 0){
        //if there is buffered audio: encode buffered first (and clear buffer)
        var len = wavBuffers.length;
        var buffered = wavBuffers.splice(0, len);
        for(var i=0; i < len; ++i){
            doEncodeFlac(buffered[i]);
        }
    }
 */
