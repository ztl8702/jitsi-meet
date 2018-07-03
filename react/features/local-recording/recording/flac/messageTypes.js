/**
 * Types of messages that are passed between the main thread and the WebWorker
 * ({@code flacEncodeWorker})
 */

// Messages sent by the main thread

/**
 * Message type that signals the termination of encoding,
 * after which no new audio bits should be sent to the
 * WebWorker.
 */
export const MAIN_THREAD_FINISH = 'finish';

/**
 * Message type that carries initial parameters for
 * the WebWorker.
 */
export const MAIN_THREAD_INIT = 'init';

/**
 * Message type that carries the newly received raw audio bits
 * for the WebWorker to encode.
 */
export const MAIN_THREAD_NEW_DATA_ARRIVED = 'encode';

// Messages sent by the WebWorker

/**
 * Message type that carries the encoded FLAC file as a Blob.
 */
export const WORKER_BLOB_READY = 'end';

// Messages sent by either the main thread or the WebWorker

/**
 * Debug messages.
 */
export const DEBUG = 'debug';
