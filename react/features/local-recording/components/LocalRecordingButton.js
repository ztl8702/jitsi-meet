/* @flow */

import InlineDialog from '@atlaskit/inline-dialog';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { ToolbarButton } from '../../toolbox';

import LocalRecordingInfoDialog from './LocalRecordingInfoDialog';
import { toggleRecording } from '../actions';

import { showErrorNotification, showNotification } from '../../notifications';
import { recordingController } from '../controller';


/**
 * A React {@code Component} for opening or closing the {@code OverflowMenu}.
 *
 * @extends Component
 */
export class LocalRecordingButton extends Component<*> {
    /**
     * {@code OverflowMenuButton} component's property types.
     *
     * @static
     */
    static propTypes = {
        dispatch: PropTypes.func,

        /**
         * Whether or not the OverflowMenu popover should display.
         */
        isOn: PropTypes.bool,

        /**
         * Calback to change the visiblility of the overflow menu.
         */
        onClick: PropTypes.func
    };

    /**
     * Initializes a new {@code OverflowMenuButton} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props: *) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onClick = this._onClick.bind(this);
    }


    /**
     * Implements {@link Component.componentWillMount}.
     *
     * @returns {void}
     */
    componentWillMount() {

        recordingController.onStateChanged = function(state) {
            this.props.dispatch(toggleRecording(state));
        }.bind(this);

        recordingController.onWarning = function(message) {
            this.props.dispatch(showErrorNotification({
                title: 'Local recording',
                description: message
            }, 10000));
        }.bind(this);

        recordingController.onNotify = function(message) {
            this.props.dispatch(showNotification({
                title: 'Local recording',
                description: message
            }, 10000));
        }.bind(this);
    }

    /**
     * Implements {@link Component.componentWillUnmount}.
     *
     * @returns {void}
     */
    componentWillUnmount() {
        recordingController.onStateChanged = null;
        recordingController.onNotify = null;
        recordingController.onWarning = null;
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { isOn } = this.props;
        const iconClasses
            = `icon-thumb-menu ${isOn ? 'icon-rec toggled' : 'icon-rec'}`;

        return (
            <div className = 'toolbox-button-wth-dialog'>
                <InlineDialog
                    content = {
                        <LocalRecordingInfoDialog />
                    }
                    isOpen = { isOn }
                    onClose = { this._onCloseDialog }
                    position = { 'top right' }>
                    <ToolbarButton
                        iconName = { iconClasses }
                        onClick = { this._onClick }
                        tooltip = { 'Local Recording Controls' } />
                </InlineDialog>
            </div>
        );
    }


    _onClick: () => void;

    /**
     * Callback invoked when the Toolbar button is clicked.
     *
     * @private
     * @returns {void}
     */
    _onClick() {
        this.props.onClick();
    }

    _onCloseDialog: () => void;

    /**
     * Callback invoked when {@code InlineDialog} signals that it should be
     * close.
     *
     * @returns {void}
     */
    _onCloseDialog() {
        // do nothing
    }
}
