/* @flow */

import { MiddlewareRegistry } from '../base/redux';
import { CONFERENCE_WILL_JOIN, CONFERENCE_JOINED } from '../base/conference';

declare var LocalRecording: Object;

MiddlewareRegistry.register(({ dispatch, getState }) => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED: {
        // the Conference object is ready
        const { conference } = getState()['features/base/conference'];

        LocalRecording.controller.registerEvents(conference);
        break;
    }
    }

    return result;
});

