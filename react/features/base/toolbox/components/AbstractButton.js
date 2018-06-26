// @flow

import React, { Component } from 'react';

import type { Styles } from './AbstractToolboxItem';
import ToolboxItem from './ToolboxItem';

export type Props = {

    /**
     * Whether to show the label or not.
     */
    showLabel: boolean,

    /**
     * Collection of styles for the button.
     */
    styles: ?Styles,

    /**
     * Collection of styles for the button, when in toggled state.
     */
    toggledStyles: ?Styles,

    /**
     * From which direction the tooltip should appear, relative to the button.
     */
    tooltipPosition: string,

    /**
     * Whether this button is visible or not.
     */
    visible: boolean
};

/**
 * An abstract implementation of a button.
 */
export default class AbstractButton<P: Props, S: *> extends Component<P, S> {
    static defaultProps = {
        showLabel: false,
        styles: undefined,
        toggledStyles: undefined,
        tooltipPosition: 'top',
        visible: true
    };

    /**
     * A succinct description of what the button does. Used by accessibility
     * tools and torture tests.
     *
     * @abstract
     */
    accessibilityLabel: string;

    /**
     * The name of the icon of this button.
     *
     * @abstract
     */
    iconName: string;

    /**
     * The text associated with this button. When `showLabel` is set to
     * {@code true}, it will be displayed alongside the icon.
     *
     * @abstract
     */
    label: string;

    /**
     * The name of the icon of this button, when toggled.
     *
     * @abstract
     */
    toggledIconName: string;

    /**
     * The text to display in the tooltip. Used only on web.
     *
     * @abstract
     */
    tooltip: string;

    /**
     * Initializes a new {@code AbstractButton} instance.
     *
     * @param {Props} props - The React {@code Component} props to initialize
     * the new {@code AbstractButton} instance with.
     */
    constructor(props: P) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onClick = this._onClick.bind(this);
    }

    /**
     * Helper function to be implemented by subclasses, which should be used
     * to handle the button being clicked / pressed.
     *
     * @protected
     * @returns {void}
     */
    _handleClick() {
        // To be implemented by subclass.
    }

    /**
     * Gets the current icon name, taking the toggled state into account. If no
     * toggled icon is provided, the regular icon will also be used in the
     * toggled state.
     *
     * @private
     * @returns {string}
     */
    _getIconName() {
        return (this._isToggled() ? this.toggledIconName : this.iconName)
            || this.iconName;
    }

    /**
     * Gets the current styles, taking the toggled state into account. If no
     * toggled styles are provided, the regular styles will also be used in the
     * toggled state.
     *
     * @private
     * @returns {?Styles}
     */
    _getStyles() {
        const { styles, toggledStyles } = this.props;

        return (this._isToggled() ? toggledStyles : styles) || styles;
    }

    /**
     * Helper function to be implemented by subclasses, which must return a
     * boolean value indicating if this button is disabled or not.
     *
     * @protected
     * @returns {boolean}
     */
    _isDisabled() {
        return false;
    }

    /**
     * Helper function to be implemented by subclasses, which must return a
     * {@code boolean} value indicating if this button is toggled or not.
     *
     * @protected
     * @returns {boolean}
     */
    _isToggled() {
        return false;
    }

    _onClick: (*) => void;

    /**
     * Handles clicking / pressing the button, and toggles the audio mute state
     * accordingly.
     *
     * @private
     * @returns {void}
     */
    _onClick() {
        this._handleClick();
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {React$Node}
     */
    render(): React$Node {
        const props = {
            ...this.props,
            accessibilityLabel: this.accessibilityLabel,
            iconName: this._getIconName(),
            label: this.label,
            styles: this._getStyles(),
            tooltip: this.tooltip
        };

        return (
            <ToolboxItem
                disabled = { this._isDisabled() }
                onClick = { this._onClick }
                { ...props } />
        );
    }
}
