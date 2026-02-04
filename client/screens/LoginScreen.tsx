import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";


import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GoogleLogo } from "@/components/GoogleLogo";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                Alert.alert("Login Failed", error.message);
            }
        } catch (e: any) {
            Alert.alert("Login Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-sync profile when session changes
    React.useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                try {
                    console.log("Syncing profile with backend...");
                    await api.syncProfile({
                        name: session.user.user_metadata?.full_name,
                        avatar_url: session.user.user_metadata?.avatar_url
                    });
                } catch (e) {
                    console.error("Profile sync failed", e);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleOAuth = async (provider: 'google' | 'facebook') => {
        // Trigger Supabase OAuth
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: 'exp://localhost:8081' // Adjust based on env
            }
        });

        if (error) Alert.alert("OAuth Error", error.message);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
        >
            <View style={[styles.container, { paddingTop: Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>

                {/* Header */}
                <View style={styles.header}>
                    <ThemedText type="h1">Welcome Back</ThemedText>
                    <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                        Sign in to continue improving your lookmaxing journey.
                    </ThemedText>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Email</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                            placeholder="Enter your email"
                            placeholderTextColor={theme.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Password</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                            placeholder="Enter your password"
                            placeholderTextColor={theme.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <Button onPress={handleLogin} disabled={loading} style={{ marginTop: Spacing.md }}>
                        {loading ? "Signing in..." : "Login"}
                    </Button>

                    <View style={styles.divider}>
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginHorizontal: Spacing.md }}>OR</ThemedText>
                        <View style={[styles.line, { backgroundColor: theme.border }]} />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.socialBtn,
                            {
                                backgroundColor: '#FFFFFF',
                                borderColor: '#DADCE0',
                                borderWidth: 1,
                                borderRadius: BorderRadius.full, // "Rounded corners" - pill shape looks best and is compliant
                                elevation: 0, // Remove shadow if any, user said subtle border
                                justifyContent: 'flex-start', // Align content start to allow absolute positioning of icon if needed, or center if using flex row
                                paddingHorizontal: Spacing.sm, // Reset padding
                            }
                        ]}
                        onPress={() => handleOAuth('google')}
                        activeOpacity={0.7}
                    >
                        {/* Wrapper for Icon to ensure proper spacing/positioning */}
                        <View style={{ marginLeft: Spacing.sm, marginRight: Spacing.md }}>
                            <GoogleLogo width={20} height={20} />
                        </View>

                        {/* Text Centered relative to the remaining space or the whole button? 
                            Google guidelines: "The text ... should be centered or left-aligned". 
                            Commonly centered in the button area or next to icon.
                            My socialBtn style has justifyContent: "center". 
                            Let's override styles.socialBtn props if needed.
                        */}
                        <ThemedText
                            type="body"
                            style={{
                                color: '#3C4043',
                                fontWeight: '500',
                                flex: 1, // Take up remaining space
                                textAlign: 'center', // Center text
                                marginRight: Spacing.lg + 4 // Compensate for icon on left to center visual weight slightly, or just center.
                            }}
                        >
                            Sign in with Google
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>
                        Don't have an account?{" "}
                    </ThemedText>
                    <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                        <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                            Sign Up
                        </ThemedText>
                    </TouchableOpacity>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        justifyContent: "center",
    },
    header: {
        marginBottom: Spacing["3xl"],
    },
    form: {
        marginBottom: Spacing["3xl"],
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    input: {
        minHeight: Spacing.inputHeight,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.lg,
        fontSize: wp('4.2%'),
        borderWidth: 1,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: Spacing["2xl"],
    },
    line: {
        flex: 1,
        height: 1,
    },
    socialBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        minHeight: Spacing.buttonHeight,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: Spacing.xl,
    },
});
