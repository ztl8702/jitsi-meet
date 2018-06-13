/**
 * Common interface for recording mechanisms
 */
export class RecordingDelegate {

    /**
     * Initialize the recording backend.
     *
     * @returns {Promise}
     */
    ensureInitialize() {
        throw new Error('Not implemented');
    }
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
