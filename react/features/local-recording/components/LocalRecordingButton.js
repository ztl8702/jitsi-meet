import InlineDialog from '@atlaskit/inline-dialog';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { ToolbarButton } from '../../toolbox';

import LocalRecordingInfoDialog from './LocalRecordingInfoDialog';

/**
 * A React {@code Component} for opening or closing the {@code OverflowMenu}.
 *
 * @extends Component
 */
export class LocalRecordingButton extends Component {
    /**
     * {@code OverflowMenuButton} component's property types.
     *
     * @static
     */
    static propTypes = {
      
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
    constructor(props) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onClick = this._onClick.bind(this);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { isOn } = this.props;
        const iconClasses = `icon-thumb-menu ${isOn ? 'icon-rec toggled' : 'icon-rec' }`;

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
                        tooltip = { 'Toggle Local Recording' } />
                </InlineDialog>
            </div>
        );
    }

    /**
     * Callback invoked when {@code InlineDialog} signals that it should be
     * close.
     *
     * @private
     * @returns {void}
     */
    _onClick() {
        this.props.onClick();
    }


}
