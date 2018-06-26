// @flow

import React, { Component } from 'react';
import { connect } from 'react-redux';

import { DialogWithTabs, hideDialog } from '../../../base/dialog';
import {
    DeviceSelection,
    getDeviceSelectionDialogProps,
    submitDeviceSelectionTab
} from '../../../device-selection';

import MoreTab from './MoreTab';
import ProfileTab from './ProfileTab';
import { getMoreTabProps, getProfileTabProps } from '../../functions';
import { submitMoreTab, submitProfileTab } from '../../actions';
import { SETTINGS_TABS } from '../../constants';

declare var APP: Object;
declare var interfaceConfig: Object;

/**
 * The type of the React {@code Component} props of
 * {@link ConnectedSettingsDialog}.
 */
type Props = {

    /**
     * Which settings tab should be initially displayed. If not defined then
     * the first tab will be displayed.
     */
    defaultTab: string,

    /**
     * Information about the tabs to be rendered.
     */
    _tabs: Array<Object>,

    /**
     * Invoked to save changed settings.
     */
    dispatch: Function,
};

/**
 * A React {@code Component} for displaying a dialog to modify local settings
 * and conference-wide (moderator) settings. This version is connected to
 * redux to get the current settings.
 *
 * @extends Component
 */
class SettingsDialog extends Component<Props> {
    /**
     * Initializes a new {@code ConnectedSettingsDialog} instance.
     *
     * @param {Props} props - The React {@code Component} props to initialize
     * the new {@code ConnectedSettingsDialog} instance with.
     */
    constructor(props: Props) {
        super(props);

        // Bind event handlers so they are only bound once for every instance.
        this._closeDialog = this._closeDialog.bind(this);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { _tabs, defaultTab, dispatch } = this.props;
        const onSubmit = this._closeDialog;
        const defaultTabIdx
            = _tabs.findIndex(({ name }) => name === defaultTab);
        const tabs = _tabs.map(tab => {
            return {
                ...tab,
                submit: (...args) => dispatch(tab.submit(...args))
            };
        });

        return (
            <DialogWithTabs
                closeDialog = { this._closeDialog }
                defaultTab = {
                    defaultTabIdx === -1 ? undefined : defaultTabIdx
                }
                onSubmit = { onSubmit }
                tabs = { tabs } />
        );
    }

    _closeDialog: () => void;

    /**
     * Callback invoked to close the dialog without saving changes.
     *
     * @private
     * @returns {void}
     */
    _closeDialog() {
        this.props.dispatch(hideDialog());
    }
}

/**
 * Maps (parts of) the Redux state to the associated props for the
 * {@code ConnectedSettingsDialog} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     tabs: Array<Object>
 * }}
 */
function _mapStateToProps(state) {
    const configuredTabs = interfaceConfig.SETTINGS_SECTIONS || [];
    const jwt = state['features/base/jwt'];

    // The settings sections to display.
    const showDeviceSettings = configuredTabs.includes('devices');
    const moreTabProps = getMoreTabProps(state);
    const { showModeratorSettings, showLanguageSettings } = moreTabProps;
    const showProfileSettings
        = configuredTabs.includes('profile') && jwt.isGuest;

    const tabs = [];

    if (showDeviceSettings) {
        tabs.push({
            name: SETTINGS_TABS.DEVICES,
            component: DeviceSelection,
            label: 'settings.devices',
            props: getDeviceSelectionDialogProps(state),
            styles: 'settings-pane devices-pane',
            submit: submitDeviceSelectionTab
        });
    }

    if (showProfileSettings) {
        tabs.push({
            name: SETTINGS_TABS.PROFILE,
            component: ProfileTab,
            label: 'profile.title',
            props: getProfileTabProps(state),
            styles: 'settings-pane profile-pane',
            submit: submitProfileTab
        });
    }

    if (showModeratorSettings || showLanguageSettings) {
        tabs.push({
            name: SETTINGS_TABS.MORE,
            component: MoreTab,
            label: 'settings.more',
            props: moreTabProps,
            styles: 'settings-pane more-pane',
            submit: submitMoreTab
        });
    }

    return { _tabs: tabs };
}

export default connect(_mapStateToProps)(SettingsDialog);
