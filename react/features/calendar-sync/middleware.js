// @flow

import { NativeModules } from 'react-native';
import RNCalendarEvents from 'react-native-calendar-events';

import { APP_WILL_MOUNT } from '../app';
import { SET_ROOM } from '../base/conference';
import { MiddlewareRegistry } from '../base/redux';
import { APP_LINK_SCHEME, parseURIString } from '../base/util';
import { APP_STATE_CHANGED } from '../mobile/background';

import {
    addKnownDomain,
    setCalendarAuthorization,
    setCalendarEvents
} from './actions';
import { REFRESH_CALENDAR } from './actionTypes';

const logger = require('jitsi-meet-logger').getLogger(__filename);

const FETCH_END_DAYS = 10;
const FETCH_START_DAYS = -1;
const MAX_LIST_LENGTH = 10;

MiddlewareRegistry.register(store => next => action => {
    const result = next(action);

    switch (action.type) {
    case APP_STATE_CHANGED:
        _maybeClearAccessStatus(store, action);
        break;

    case APP_WILL_MOUNT:
        _ensureDefaultServer(store);
        _fetchCalendarEntries(store, false, false);
        break;

    case REFRESH_CALENDAR:
        _fetchCalendarEntries(store, true, action.forcePermission);
        break;

    case SET_ROOM:
        _parseAndAddKnownDomain(store);
        break;
    }

    return result;
});

/**
 * Clears the calendar access status when the app comes back from the
 * background. This is needed as some users may never quit the app, but puts it
 * into the background and we need to try to request for a permission as often
 * as possible, but not annoyingly often.
 *
 * @param {Object} store - The redux store.
 * @param {Object} action - The Redux action.
 * @private
 * @returns {void}
 */
function _maybeClearAccessStatus(store, { appState }) {
    if (appState === 'background') {
        store.dispatch(setCalendarAuthorization(undefined));
    }
}

/**
 * Ensures calendar access if possible and resolves the promise if it's granted.
 *
 * @param {boolean} promptForPermission - Flag to tell the app if it should
 * prompt for a calendar permission if it wasn't granted yet.
 * @param {Function} dispatch - The Redux dispatch function.
 * @private
 * @returns {Promise}
 */
function _ensureCalendarAccess(promptForPermission, dispatch) {
    return new Promise((resolve, reject) => {
        RNCalendarEvents.authorizationStatus()
            .then(status => {
                if (status === 'authorized') {
                    resolve(true);
                } else if (promptForPermission) {
                    RNCalendarEvents.authorizeEventStore()
                        .then(result => {
                            dispatch(setCalendarAuthorization(result));
                            resolve(result === 'authorized');
                        })
                        .catch(reject);
                } else {
                    resolve(false);
                }
            })
            .catch(reject);
    });
}

/**
 * Ensures presence of the default server in the known domains list.
 *
 * @param {Object} store - The redux store.
 * @private
 * @returns {Promise}
 */
function _ensureDefaultServer({ dispatch, getState }) {
    const state = getState();
    const defaultURL
        = parseURIString(state['features/app'].app._getDefaultURL());

    dispatch(addKnownDomain(defaultURL.host));
}

/**
 * Reads the user's calendar and updates the stored entries if need be.
 *
 * @param {Object} store - The redux store.
 * @param {boolean} maybePromptForPermission - Flag to tell the app if it should
 * prompt for a calendar permission if it wasn't granted yet.
 * @param {boolean|undefined} forcePermission - Whether to force to re-ask for
 * the permission or not.
 * @private
 * @returns {void}
 */
function _fetchCalendarEntries(
        { dispatch, getState },
        maybePromptForPermission,
        forcePermission) {
    if (!_isCalendarEnabled()) {
        // The calendar feature is not enabled.
        return;
    }

    const state = getState()['features/calendar-sync'];
    const promptForPermission
        = (maybePromptForPermission && !state.authorization)
            || forcePermission;

    _ensureCalendarAccess(promptForPermission, dispatch)
        .then(accessGranted => {
            if (accessGranted) {
                const startDate = new Date();
                const endDate = new Date();

                startDate.setDate(startDate.getDate() + FETCH_START_DAYS);
                endDate.setDate(endDate.getDate() + FETCH_END_DAYS);

                RNCalendarEvents.fetchAllEvents(
                        startDate.getTime(),
                        endDate.getTime(),
                        [])
                    .then(events =>
                        _updateCalendarEntries(
                            events,
                            state.knownDomains,
                            dispatch))
                    .catch(error =>
                        logger.error('Error fetching calendar.', error));
            } else {
                logger.warn('Calendar access not granted.');
            }
        })
        .catch(reason => {
            logger.error('Error accessing calendar.', reason);
        });
}

/**
 * Retreives a jitsi URL from an event if present.
 *
 * @param {Object} event - The event to parse.
 * @param {Array<string>} knownDomains - The known domain names.
 * @private
 * @returns {string}
 */
function _getURLFromEvent(event, knownDomains) {
    const linkTerminatorPattern = '[^\\s<>$]';
    const urlRegExp
        = new RegExp(
            `http(s)?://(${knownDomains.join('|')})/${linkTerminatorPattern}+`,
            'gi');
    const schemeRegExp
        = new RegExp(`${APP_LINK_SCHEME}${linkTerminatorPattern}+`, 'gi');
    const fieldsToSearch = [
        event.title,
        event.url,
        event.location,
        event.notes,
        event.description
    ];

    for (const field of fieldsToSearch) {
        if (typeof field === 'string') {
            const matches = urlRegExp.exec(field) || schemeRegExp.exec(field);

            if (matches) {
                return matches[0];
            }
        }
    }

    return null;
}

/**
 * Determines whether the calendar feature is enabled by the app. For
 * example, Apple through its App Store requires NSCalendarsUsageDescription in
 * the app's Info.plist or App Store rejects the app.
 *
 * @returns {boolean} If the app has enabled the calendar feature, {@code true};
 * otherwise, {@code false}.
 */
export function _isCalendarEnabled() {
    const { calendarEnabled } = NativeModules.AppInfo;

    return typeof calendarEnabled === 'undefined' ? true : calendarEnabled;
}

/**
 * Retreives the domain name of a room upon join and stores it in the known
 * domain list, if not present yet.
 *
 * @param {Object} store - The redux store.
 * @private
 * @returns {Promise}
 */
function _parseAndAddKnownDomain({ dispatch, getState }) {
    const { locationURL } = getState()['features/base/connection'];

    dispatch(addKnownDomain(locationURL.host));
}

/**
 * Updates the calendar entries in Redux when new list is received.
 *
 * @param {Object} event - An event returned from the native calendar.
 * @param {Array<string>} knownDomains - The known domain list.
 * @private
 * @returns {CalendarEntry}
 */
function _parseCalendarEntry(event, knownDomains) {
    if (event) {
        const url = _getURLFromEvent(event, knownDomains);

        if (url) {
            const startDate = Date.parse(event.startDate);
            const endDate = Date.parse(event.endDate);

            if (isNaN(startDate) || isNaN(endDate)) {
                logger.warn(
                    'Skipping invalid calendar event',
                    event.title,
                    event.startDate,
                    event.endDate
                );
            } else {
                return {
                    endDate,
                    id: event.id,
                    startDate,
                    title: event.title,
                    url
                };
            }
        }
    }

    return null;
}

/**
 * Updates the calendar entries in Redux when new list is received.
 *
 * @param {Array<CalendarEntry>} events - The new event list.
 * @param {Array<string>} knownDomains - The known domain list.
 * @param {Function} dispatch - The Redux dispatch function.
 * @private
 * @returns {void}
 */
function _updateCalendarEntries(events, knownDomains, dispatch) {
    if (events && events.length) {
        const eventList = [];

        for (const event of events) {
            const calendarEntry
                = _parseCalendarEntry(event, knownDomains);
            const now = Date.now();

            if (calendarEntry && calendarEntry.endDate > now) {
                eventList.push(calendarEntry);
            }
        }

        dispatch(
            setCalendarEvents(
                eventList
                    .sort((a, b) => a.startDate - b.startDate)
                    .slice(0, MAX_LIST_LENGTH)));
    }
}
