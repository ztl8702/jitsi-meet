import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
    PARTICIPANT_ROLE,
    getLocalParticipant
} from '../../base/participants';

import { clockTick } from '../actions';

/**
 * A React Component with the contents for a dialog that shows information about
 * the current conference.
 *
 * @extends Component
 */
class LocalRecordingInfoDialog extends Component {
    /**
     * {@code InfoDialog} component's property types.
     *
     * @static
     */
    static propTypes = {

        /**
         * The size (in bytes) of encoded audio in memory
         *
         */
        audioFileSize: PropTypes.number,
        isOn: PropTypes.bool,
        currentTime: PropTypes.object,
        encodingFormat: PropTypes.string,
        isModerator: PropTypes.bool,
        dispatch: PropTypes.func,
        /**
         * dd
         *
         * @type {Date}
         */
        recordingStartedAt: PropTypes.object

    };

    _timer = null;


    /**
     * Initializes new {@code InfoDialog} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.componentWillMount = this.componentWillMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
    }


    componentWillMount() {
        this._timer = setInterval(
            function () {
                this.props.dispatch(clockTick())
            }.bind(this),
            1000
        );
    }

    componentWillUnmount() {
        clearInterval(this._timer);
        this._timer = null;
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { isModerator, recordingStartedAt, currentTime, encodingFormat, isOn } = this.props;

        return (
            <div
                className='info-dialog' >
                <div className='info-dialog-column'>
                    <h4 className='info-dialog-icon'>
                        <i className='icon-info' />
                    </h4>
                </div>
                <div className='info-dialog-column'>
                    <div className='info-dialog-title'>
                        Local Recording
                    </div>
                    <div className='info-dialog-conference-url'>
                        <span className='info-label'>
                            Moderator:
                        </span>
                        <span className='spacer'>&nbsp;</span>
                        <span className='info-value'>
                            {isModerator ? 'Yes' : 'No'}
                        </span>
                    </div>
                    { isOn && (
                        <div className='info-dialog-conference-url'>
                            <span className='info-label'>
                                Duration:
                            </span>
                            <span className='spacer'>&nbsp;</span>
                            <span className='info-value'>
                                {this._getDuration(currentTime, recordingStartedAt)}
                            </span>
                        </div>)
                    }
                    {isOn && (
                    <div className='info-dialog-conference-url'>
                        <span className='info-label'>
                            Encoding:
                        </span>
                        <span className='spacer'>&nbsp;</span>
                        <span className='info-value'>
                            {encodingFormat}
                        </span>
                    </div>)
                    }
                    {
                        isModerator && (
                            <div className='info-dialog-action-links'>
                                <div className='info-dialog-action-link'>
                                    {isOn ? (
                                        <a
                                            className='info-copy'
                                            onClick = {this._onStop }>
                                            {'Stop'}
                                        </a>)
                                        : (
                                            <a
                                                className='info-copy'
                                                onClick = {this._onStart}>
                                                {'Start'}
                                            </a>
                                        )
                                    }

                                </div>
                            </div>
                        )
                    }

                </div>

            </div>
        );
    }

    /**
     * Creates a duration string "HH:MM:SS" from two Date objects
     * @param {Date} now - .
     * @param {Date} prev - .
     * @returns {string}
     */
    _getDuration(now, prev) {
        // a hack. better ways to do time diff?

        const diff = new Date(now - prev);

        const seconds = diff.getUTCSeconds();
        const minutes = diff.getUTCMinutes();
        const hours = diff.getUTCHours();

        /**
         * Zero padding.
         *
         * @param {number} num - 0-60.
         * @returns {string}
         */
        function zeroPad(num) {
            if (num < 10) {
                return `0${num}`;
            }

            return num.toString();
        }

        return `${zeroPad(hours)}:${zeroPad(minutes)}:${zeroPad(seconds)}`;

    }

    _onStart() {
        LocalRecording.signalStart();
    }

    _onStop() {
        LocalRecording.signalEnd();
    }

}

/**
 * Maps (parts of) the Redux state to the associated props for the
 * {@code InfoDialog} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _canEditPassword: boolean,
 *     _conference: Object,
 *     _conferenceName: string,
 *     _inviteURL: string,
 *     _locked: string,
 *     _password: string
 * }}
 */
function _mapStateToProps(state) {
    const {
        currentTime,
        recordingStartedAt,
        encodingFormat,
        on: isOn
    } = state['features/local-recording'];
    const isModerator
        = getLocalParticipant(state).role === PARTICIPANT_ROLE.MODERATOR;

    return {
        isOn,
        isModerator,
        currentTime,
        recordingStartedAt,
        encodingFormat,
        audioFileSize: 0
    };
}

export default connect(_mapStateToProps)(LocalRecordingInfoDialog);

