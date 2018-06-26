// @flow

import _ from 'lodash';
import type { Dispatch } from 'redux';

import { conferenceLeft, conferenceWillLeave } from '../conference';
import JitsiMeetJS, { JitsiConnectionEvents } from '../lib-jitsi-meet';
import { parseStandardURIString } from '../util';

import {
    CONNECTION_DISCONNECTED,
    CONNECTION_ESTABLISHED,
    CONNECTION_FAILED,
    CONNECTION_WILL_CONNECT,
    SET_LOCATION_URL
} from './actionTypes';

/**
 * Opens new connection.
 *
 * @param {string} [id] - The XMPP user's ID (e.g. user@server.com).
 * @param {string} [password] - The XMPP user's password.
 * @returns {Function}
 */
export function connect(id: ?string, password: ?string) {
    return (dispatch: Dispatch<*>, getState: Function) => {
        const state = getState();
        const options = _constructOptions(state);
        const { issuer, jwt } = state['features/base/jwt'];
        const connection
            = new JitsiMeetJS.JitsiConnection(
                options.appId,
                jwt && issuer && issuer !== 'anonymous' ? jwt : undefined,
                options);

        dispatch(_connectionWillConnect(connection));

        connection.addEventListener(
            JitsiConnectionEvents.CONNECTION_DISCONNECTED,
            _onConnectionDisconnected);
        connection.addEventListener(
            JitsiConnectionEvents.CONNECTION_ESTABLISHED,
            _onConnectionEstablished);
        connection.addEventListener(
            JitsiConnectionEvents.CONNECTION_FAILED,
            _onConnectionFailed);

        return connection.connect({
            id,
            password
        });

        /**
         * Dispatches CONNECTION_DISCONNECTED action when connection is
         * disconnected.
         *
         * @param {string} message - Disconnect reason.
         * @private
         * @returns {void}
         */
        function _onConnectionDisconnected(message: string) {
            connection.removeEventListener(
                JitsiConnectionEvents.CONNECTION_DISCONNECTED,
                _onConnectionDisconnected);

            dispatch(_connectionDisconnected(connection, message));
        }

        /**
         * Resolves external promise when connection is established.
         *
         * @private
         * @returns {void}
         */
        function _onConnectionEstablished() {
            unsubscribe();
            dispatch(connectionEstablished(connection));
        }

        /**
         * Rejects external promise when connection fails.
         *
         * @param {JitsiConnectionErrors} err - Connection error.
         * @param {string} [msg] - Error message supplied by lib-jitsi-meet.
         * @param {Object} [credentials] - The invalid credentials that were
         * used to authenticate and the authentication failed.
         * @param {string} [credentials.jid] - The XMPP user's ID.
         * @param {string} [credentials.password] - The XMPP user's password.
         * @private
         * @returns {void}
         */
        function _onConnectionFailed(err, msg, credentials) {
            unsubscribe();
            console.error('CONNECTION FAILED:', err, msg);
            dispatch(connectionFailed(connection, err, msg, credentials));
        }

        /**
         * Unsubscribes connection instance from CONNECTION_ESTABLISHED
         * and CONNECTION_FAILED events.
         *
         * @returns {void}
         */
        function unsubscribe() {
            connection.removeEventListener(
                JitsiConnectionEvents.CONNECTION_ESTABLISHED,
                _onConnectionEstablished);
            connection.removeEventListener(
                JitsiConnectionEvents.CONNECTION_FAILED,
                _onConnectionFailed);
        }
    };
}

/**
 * Create an action for when the signaling connection has been lost.
 *
 * @param {JitsiConnection} connection - The JitsiConnection which disconnected.
 * @param {string} message - Error message.
 * @private
 * @returns {{
 *     type: CONNECTION_DISCONNECTED,
 *     connection: JitsiConnection,
 *     message: string
 * }}
 */
function _connectionDisconnected(connection: Object, message: string) {
    return {
        type: CONNECTION_DISCONNECTED,
        connection,
        message
    };
}

/**
 * Create an action for when a connection will connect.
 *
 * @param {JitsiConnection} connection - The JitsiConnection which will connect.
 * @private
 * @returns {{
 *     type: CONNECTION_WILL_CONNECT,
 *     connection: JitsiConnection
 * }}
 */
function _connectionWillConnect(connection) {
    return {
        type: CONNECTION_WILL_CONNECT,
        connection
    };
}

/**
 * Create an action for when the signaling connection has been established.
 *
 * @param {JitsiConnection} connection - The JitsiConnection which was
 * established.
 * @public
 * @returns {{
 *     type: CONNECTION_ESTABLISHED,
 *     connection: JitsiConnection
 * }}
 */
export function connectionEstablished(connection: Object) {
    return {
        type: CONNECTION_ESTABLISHED,
        connection
    };
}

/* eslint-disable max-params */

/**
 * Create an action for when the signaling connection could not be created.
 *
 * @param {JitsiConnection} connection - The JitsiConnection which failed.
 * @param {string} error - Error.
 * @param {string} [message] - Error message.
 * @param {Object} [credentials] - The invalid credentials that failed
 * the authentication.
 * @param {Object} [details] - The details about the connection failed event.
 * @param {boolean} [recoverable] - Indicates whether this event is recoverable
 * or not.
 * @public
 * @returns {{
 *     type: CONNECTION_FAILED,
 *     connection: JitsiConnection,
 *     error: Object
 * }}
 */
export function connectionFailed(
        connection: Object,
        error: string,
        message: ?string,
        credentials: ?Object,
        details: ?Object,
        recoverable: ?boolean) {
    return {
        type: CONNECTION_FAILED,
        connection,

        // Make the error resemble an Error instance (to the extent that
        // jitsi-meet needs it).
        error: {
            credentials:
                credentials && Object.keys(credentials).length
                    ? credentials
                    : undefined,
            message,
            name: error,
            details,
            recoverable
        }
    };
}

/* eslint-enable max-params */

/**
 * Constructs options to be passed to the constructor of {@code JitsiConnection}
 * based on the redux state.
 *
 * @param {Object} state - The redux state.
 * @returns {Object} The options to be passed to the constructor of
 * {@code JitsiConnection}.
 */
function _constructOptions(state) {
    const defaultOptions = state['features/base/connection'].options;
    const options = _.merge(
        {},
        defaultOptions,

        // Lib-jitsi-meet wants the config passed in multiple places and here is
        // the latest one I have discovered.
        state['features/base/config'],
    );
    let { bosh } = options;

    if (bosh) {
        // Append room to the URL's search.
        const { room } = state['features/base/conference'];

        // XXX The Jitsi Meet deployments require the room argument to be in
        // lower case at the time of this writing but, unfortunately, they do
        // not ignore case themselves.
        room && (bosh += `?room=${room.toLowerCase()}`);

        // XXX By default, config.js does not add a protocol to the BOSH URL.
        // Which trips React Native. Make sure there is a protocol in order to
        // satisfy React Native.
        if (bosh !== defaultOptions.bosh
                && !parseStandardURIString(bosh).protocol) {
            const { protocol } = parseStandardURIString(defaultOptions.bosh);

            protocol && (bosh = protocol + bosh);
        }

        options.bosh = bosh;
    }

    return options;
}

/**
 * Closes connection.
 *
 * @returns {Function}
 */
export function disconnect() {
    return (dispatch: Dispatch<*>, getState: Function): Promise<void> => {
        const state = getState();
        const { conference, joining } = state['features/base/conference'];

        // The conference we have already joined or are joining.
        const conference_ = conference || joining;

        // Promise which completes when the conference has been left and the
        // connection has been disconnected.
        let promise;

        // Leave the conference.
        if (conference_) {
            // In a fashion similar to JitsiConference's CONFERENCE_LEFT event
            // (and the respective Redux action) which is fired after the
            // conference has been left, notify the application about the
            // intention to leave the conference.
            dispatch(conferenceWillLeave(conference_));

            promise
                = conference_.leave()
                    .catch(() => {
                        // The library lib-jitsi-meet failed to make the
                        // JitsiConference leave. Which may be because
                        // JitsiConference thinks it has already left.
                        // Regardless of the failure reason, continue in
                        // jitsi-meet as if the leave has succeeded.
                        dispatch(conferenceLeft(conference_));
                    });
        } else {
            promise = Promise.resolve();
        }

        // Disconnect the connection.
        const { connecting, connection } = state['features/base/connection'];

        // The connection we have already connected or are connecting.
        const connection_ = connection || connecting;

        if (connection_) {
            promise = promise.then(() => connection_.disconnect());
        }

        return promise;
    };
}

/**
 * Sets the location URL of the application, connecton, conference, etc.
 *
 * @param {URL} [locationURL] - The location URL of the application,
 * connection, conference, etc.
 * @returns {{
 *     type: SET_LOCATION_URL,
 *     locationURL: URL
 * }}
 */
export function setLocationURL(locationURL: ?URL) {
    return {
        type: SET_LOCATION_URL,
        locationURL
    };
}
