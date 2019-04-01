/* @flow */

import * as React from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { polyfill } from 'react-lifecycles-compat'
import Fingerprint from 'react-native-fingerprint-android'
import FingerprintScanner from 'react-native-fingerprint-scanner'
// eslint-disable-next-line import/no-unresolved
import { ScreenContainer } from 'react-native-screens'

import createTabNavigator, { type InjectedProps } from '../utils/createTabNavigator'
import BottomTabBar, { type TabBarOptions } from '../views/BottomTabBar'
import ResourceSavingScene from '../views/ResourceSavingScene'

type Props = InjectedProps & {
    lazy?: boolean,
    tabBarComponent?: React.ComponentType<*>,
    tabBarOptions?: TabBarOptions,
}

type State = {
    loaded: number[],
}

class TabNavigationView extends React.PureComponent<Props, State> {
    static defaultProps = {
        lazy: true,
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const { index } = nextProps.navigation.state

        return {
            // Set the current tab to be loaded if it was not loaded before
            loaded: prevState.loaded.includes(index) ? prevState.loaded : [...prevState.loaded, index],
        }
    }

    state = {
        loaded: [this.props.navigation.state.index],
    }

    _renderTabBar = () => {
        const {
            tabBarComponent: TabBarComponent = BottomTabBar,
            tabBarOptions,
            navigation,
            screenProps,
            getLabelText,
            getAccessibilityLabel,
            getButtonComponent,
            getTestID,
            renderIcon,
            onTabPress,
            onTabLongPress,
        } = this.props

        const { descriptors } = this.props
        const { state } = this.props.navigation
        const route = state.routes[state.index]
        const descriptor = descriptors[route.key]
        const options = descriptor.options

        if (options.tabBarVisible === false) {
            return null
        }

        return (
            <TabBarComponent
                {...tabBarOptions}
                jumpTo={this._jumpTo}
                navigation={navigation}
                screenProps={screenProps}
                onTabPress={onTabPress}
                onTabLongPress={onTabLongPress}
                getLabelText={getLabelText}
                getButtonComponent={getButtonComponent}
                getAccessibilityLabel={getAccessibilityLabel}
                getTestID={getTestID}
                renderIcon={renderIcon}
            />
        )
    }

    _jumpTo = (key: string) => {
        const { navigation, onIndexChange } = this.props

        const index = navigation.state.routes.findIndex(route => route.key === key)

        onIndexChange(index)
    }

    render() {
        const { navigation, renderScene, lazy, isFingerPrintSupported } = this.props
        const { routes } = navigation.state
        const { loaded } = this.state

        return (
            <View style={styles.container}>
                <ScreenContainer style={styles.pages}>
                    {routes.map((route, index) => {
                        if (!isFingerPrintSupported && route.key === 'finger') return null
                        if (lazy && !loaded.includes(index)) {
                            // Don't render a screen if we've never navigated to it
                            return null
                        }

                        const isFocused = navigation.state.index === index

                        return (
                            <ResourceSavingScene key={route.key} style={StyleSheet.absoluteFill} isVisible={isFocused}>
                                {renderScene({ route })}
                            </ResourceSavingScene>
                        )
                    })}
                </ScreenContainer>
                {this._renderTabBar()}
            </View>
        )
    }
}

polyfill(TabNavigationView)

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    pages: {
        flex: 1,
    },
})

function withFingerPrint(WrappedComponent) {
    return class extends React.Component {
        state = {
            checkFinished: false,
            isFingerPrintSupported: false,
        }

        async componentDidMount() {
            const checkFingerPrintSupport = Platform.select({
                ios: FingerprintScanner.isSensorAvailable,
                android: Fingerprint.hasEnrolledFingerprints,
            })

            try {
                const isFingerPrintSupported = await checkFingerPrintSupport()
                this.setState({ checkFinished: true, isFingerPrintSupported })
            } catch (e) {
                this.setState({ checkFinished: true, isFingerPrintSupported: false })
            }
        }

        render() {
            if (!this.state.checkFinished) return null
            return <WrappedComponent {...this.props} isFingerPrintSupported={this.state.isFingerPrintSupported} />
        }
    }
}

export default createTabNavigator(withFingerPrint(TabNavigationView))
