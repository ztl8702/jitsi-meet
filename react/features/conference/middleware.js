// @flow

import { appNavigate } from '../app';
import {
    CONFERENCE_JOINED,
    conferenceFailed,
    KICKED_OUT,
    setReceiveVideoQuality,
    VIDEO_QUALITY_LEVELS
} from '../base/conference';
import { SET_REDUCED_UI } from '../base/responsive-ui';
import { MiddlewareRegistry } from '../base/redux';
import { setFilmstripEnabled } from '../filmstrip';
import { setToolboxEnabled } from '../toolbox';

/**
 * FIXME Usually the value from lib-jitsi-meet should be used
 * ({@link JitsiConferenceEvents.KICKED}), but it contains
 * a typo and given that this string will be emitted to the consumer of public
 * mobile API it's probably better to not advertise it as is (until it gets
 * fixed).
 * @type {string}
 */
const KICKED_OUT_REASON = 'conference.kicked';

MiddlewareRegistry.register(store => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED:
    case SET_REDUCED_UI: {
        const { dispatch, getState } = store;
        const state = getState();
        const { audioOnly } = state['features/base/conference'];
        const { reducedUI } = state['features/base/responsive-ui'];

        dispatch(setToolboxEnabled(!reducedUI));
        dispatch(setFilmstripEnabled(!reducedUI));

        // XXX: Currently setting the received video quality will disable
        // audio-only mode if engaged, that's why we check for it here.
        audioOnly
            || dispatch(
                setReceiveVideoQuality(
                    reducedUI
                        ? VIDEO_QUALITY_LEVELS.LOW
                        : VIDEO_QUALITY_LEVELS.HIGH));

        break;
    }
    case KICKED_OUT: {
        store.dispatch(conferenceFailed(action.conference, KICKED_OUT_REASON));
        store.dispatch(appNavigate(undefined));
        break;
    }
    }

    return result;
});
