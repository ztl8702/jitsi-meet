/* @flow */

import { MiddlewareRegistry } from '../base/redux';
import { CONFERENCE_JOINED } from '../base/conference';

import { recordingController } from './controller';
import { APP_WILL_MOUNT, APP_WILL_UNMOUNT } from '../app';
import { signalLocalRecordingEngagement } from './actions';
import { showNotification } from '../notifications';

MiddlewareRegistry.register(({ getState, dispatch }) => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED: {
        // the Conference object is ready
        const { conference } = getState()['features/base/conference'];

        recordingController.registerEvents(conference);
        break;
    }
    case APP_WILL_MOUNT:
        // realize the delegates on recordingController,
        // providing UI reactions.
        recordingController.onStateChanged = function(state) {
            dispatch(signalLocalRecordingEngagement(state));
        };

        recordingController.onWarning = function(message) {
            dispatch(showNotification({
                title: 'Local recording',
                description: message
            }, 10000));
        };

        recordingController.onNotify = function(message) {
            dispatch(showNotification({
                title: 'Local recording',
                description: message
            }, 10000));
        };
        break;
    case APP_WILL_UNMOUNT:
        recordingController.onStateChanged = null;
        recordingController.onNotify = null;
        recordingController.onWarning = null;
        break;
    }

    return result;
});
