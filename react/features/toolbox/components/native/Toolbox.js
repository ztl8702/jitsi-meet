// @flow

import React, { Component } from 'react';
import { View } from 'react-native';
import { connect } from 'react-redux';

import { Container } from '../../../base/react';
import {
    isNarrowAspectRatio,
    makeAspectRatioAware
} from '../../../base/responsive-ui';
import { InviteButton } from '../../../invite';

import AudioMuteButton from '../AudioMuteButton';
import HangupButton from '../HangupButton';
import VideoMuteButton from '../VideoMuteButton';

import OverflowMenuButton from './OverflowMenuButton';
import styles, {
    hangupButtonStyles,
    toolbarButtonStyles,
    toolbarToggledButtonStyles
} from './styles';

/**
 * Number of buttons in the toolbar.
 */
const NUM_TOOLBAR_BUTTONS = 4;

/**
 * Factor relating the hangup button and other toolbar buttons.
 */
const TOOLBAR_BUTTON_SIZE_FACTOR = 0.8;

/**
 * The type of {@link Toolbox}'s React {@code Component} props.
 */
type Props = {

    /**
     * The indicator which determines whether the toolbox is visible.
     */
    _visible: boolean,

    /**
     * The redux {@code dispatch} function.
     */
    dispatch: Function
};

/**
 * The type of {@link Toolbox}'s React {@code Component} state.
 */
type State = {

    /**
     * The detected width for this component.
     */
    width: number
};

/**
 * Implements the conference toolbox on React Native.
 */
class Toolbox extends Component<Props, State> {
    state = {
        width: 0
    };

    /**
     *  Initializes a new {@code Toolbox} instance.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        this._onLayout = this._onLayout.bind(this);
    }

    _onLayout: (Object) => void;

    /**
     * Handles the "on layout" View's event and stores the width as state.
     *
     * @param {Object} event - The "on layout" event object/structure passed
     * by react-native.
     * @private
     * @returns {void}
     */
    _onLayout({ nativeEvent: { layout: { width } } }) {
        this.setState({ width });
    }

    /**
     * Calculates how large our toolbar buttons can be, given the available
     * width. In the future we might want to have a size threshold, and once
     * it's passed a completely different style could be used, akin to the web.
     *
     * @private
     * @returns {number}
     */
    _calculateToolbarButtonSize() {
        const width = this.state.width;
        const hangupButtonSize = styles.hangupButton.width;

        let buttonSize
            = (width - hangupButtonSize
                - (NUM_TOOLBAR_BUTTONS * styles.toolbarButton.margin * 2))
                    / NUM_TOOLBAR_BUTTONS;

        // Make sure it's an even number.
        buttonSize = 2 * Math.round(buttonSize / 2);

        // The button should be at most 80% of the hangup button's size.
        return Math.min(
            buttonSize, hangupButtonSize * TOOLBAR_BUTTON_SIZE_FACTOR);
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const toolboxStyle
            = isNarrowAspectRatio(this)
                ? styles.toolboxNarrow
                : styles.toolboxWide;
        const { _visible } = this.props;
        const buttonStyles = {
            ...toolbarButtonStyles
        };
        const toggledButtonStyles = {
            ...toolbarToggledButtonStyles
        };

        if (_visible && this.state.width) {
            const buttonSize = this._calculateToolbarButtonSize();
            const extraStyle = {
                borderRadius: buttonSize / 2,
                height: buttonSize,
                width: buttonSize
            };

            buttonStyles.style = [ buttonStyles.style, extraStyle ];
            toggledButtonStyles.style
                = [ toggledButtonStyles.style, extraStyle ];
        }

        return (
            <Container
                onLayout = { this._onLayout }
                style = { toolboxStyle }
                visible = { _visible } >
                <View
                    pointerEvents = 'box-none'
                    style = { styles.toolbar }>
                    <InviteButton styles = { buttonStyles } />
                    <AudioMuteButton
                        styles = { buttonStyles }
                        toggledStyles = { toggledButtonStyles } />
                    <HangupButton styles = { hangupButtonStyles } />
                    <VideoMuteButton
                        styles = { buttonStyles }
                        toggledStyles = { toggledButtonStyles } />
                    <OverflowMenuButton
                        styles = { buttonStyles }
                        toggledStyles = { toggledButtonStyles } />
                </View>
            </Container>
        );
    }
}

/**
 * Maps parts of the redux state to {@link Toolbox} (React {@code Component})
 * props.
 *
 * @param {Object} state - The redux state of which parts are to be mapped to
 * {@code Toolbox} props.
 * @private
 * @returns {{
 *     _enabled: boolean,
 *     _visible: boolean
 * }}
 */
function _mapStateToProps(state: Object): Object {
    const { enabled, visible } = state['features/toolbox'];

    return {
        _visible: enabled && visible
    };
}

export default connect(_mapStateToProps)(makeAspectRatioAware(Toolbox));
