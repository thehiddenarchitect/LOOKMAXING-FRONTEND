import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export function StatusBarBackground() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    // If on Android/iOS, this view pushes content down by the status bar height
    // and fills the area with the app background color.
    return (
        <View style={[styles.statusBar, { height: insets.top, backgroundColor: theme.backgroundRoot }]} />
    );
}

const styles = StyleSheet.create({
    statusBar: {
        width: '100%',
        zIndex: 9999, // Ensure it sits on top if using absolute, but here we use flex layout
    },
});
