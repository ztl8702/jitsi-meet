import { MiddlewareRegistry } from '../base/redux';
import { CONFERENCE_WILL_JOIN } from '../base/conference';

declare var LocalRecording: Object;

MiddlewareRegistry.register(({ dispatch, getState }) => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_WILL_JOIN: {
        // the Conference object is ready

        LocalRecording.controller.registerEvents();
        break;
    }
    }

    return result;
});

