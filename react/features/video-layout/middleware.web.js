// @flow

import VideoLayout from '../../../modules/UI/videolayout/VideoLayout.js';
import UIEvents from '../../../service/UI/UIEvents';

import {
    DOMINANT_SPEAKER_CHANGED,
    PARTICIPANT_UPDATED,
    PIN_PARTICIPANT
} from '../base/participants';
import { MiddlewareRegistry } from '../base/redux';

declare var APP: Object;

/**
 * Middleware which intercepts actions and updates the legacy component
 * {@code VideoLayout} as needed. The purpose of this middleware is to redux-ify
 * {@code VideoLayout} without having to simultaneously react-ifying it.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
// eslint-disable-next-line no-unused-vars
MiddlewareRegistry.register(store => next => action => {
    // Purposefully perform additional actions after state update to mimic
    // being connected to the store for updates.
    const result = next(action);

    switch (action.type) {

    case PARTICIPANT_UPDATED: {
        // Look for actions that triggered a change to connectionStatus. This is
        // done instead of changing the connection status change action to be
        // explicit in order to minimize changes to other code.
        if (typeof action.participant.connectionStatus !== 'undefined') {
            VideoLayout.onParticipantConnectionStatusChanged(
                action.participant.id);
        }
        break;
    }

    case DOMINANT_SPEAKER_CHANGED:
        VideoLayout.onDominantSpeakerChanged(action.participant.id);
        break;

    case PIN_PARTICIPANT:
        VideoLayout.onPinChange(action.participant.id);
        APP.UI.emitEvent(
            UIEvents.PINNED_ENDPOINT,
            action.participant.id,
            Boolean(action.participant.id));
        break;
    }

    return result;
});
