import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GoogleLogo } from "@/components/GoogleLogo";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

// For web browser to close properly after OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(false);

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

    // Auto-sync profile when session changes (non-blocking)
    React.useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Fire and forget - don't block the UI
                const syncWithTimeout = async () => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                    try {
                        console.log("Syncing profile with backend (background)...");
                        await api.syncProfile({
                            name: session.user.user_metadata?.full_name,
                            avatar_url: session.user.user_metadata?.avatar_url
                        });
                        console.log("Profile sync complete");
                    } catch (e: any) {
                        if (e.name === 'AbortError') {
                            console.log("Profile sync timed out - will retry later");
                        } else {
                            console.error("Profile sync failed:", e.message);
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }
                };

                syncWithTimeout(); // Don't await - run in background
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleGoogleSignIn = async () => {
        try {
            setOauthLoading(true);

            // Generate the proper redirect URL based on platform
            const redirectUrl = AuthSession.makeRedirectUri({
                scheme: 'lookmax',
                path: 'auth/callback'
            });

            console.log("OAuth Redirect URL:", redirectUrl);

            // Get the OAuth URL from Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true, // We'll handle the redirect ourselves
                }
            });

            if (error) {
                Alert.alert("OAuth Error", error.message);
                return;
            }

            if (!data.url) {
                Alert.alert("OAuth Error", "Failed to get OAuth URL");
                return;
            }

            // Open the OAuth URL in a browser
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUrl,
                {
                    showInRecents: true,
                    preferEphemeralSession: false, // Keep session for better UX
                }
            );

            console.log("OAuth Result:", result);

            if (result.type === 'success' && result.url) {
                // Extract tokens from the URL
                const url = new URL(result.url);

                // Handle fragment-based tokens (Supabase returns tokens in hash)
                const hashParams = new URLSearchParams(url.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    // Set the session in Supabase
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        console.error("Session Error:", sessionError);
                        Alert.alert("Login Error", "Failed to complete sign in. Please try again.");
                    }
                    // Success! AuthContext will detect the session change
                } else {
                    console.error("No tokens found in URL:", result.url);
                    Alert.alert("Login Error", "Authentication failed. Please try again.");
                }
            } else if (result.type === 'cancel') {
                console.log("OAuth cancelled by user");
            } else {
                console.log("OAuth result:", result);
            }
        } catch (e: any) {
            console.error("OAuth Exception:", e);
            Alert.alert("OAuth Error", e.message || "An unexpected error occurred");
        } finally {
            setOauthLoading(false);
        }
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
                                borderRadius: BorderRadius.full,
                                elevation: 0,
                                justifyContent: 'flex-start',
                                paddingHorizontal: Spacing.sm,
                                opacity: oauthLoading ? 0.6 : 1,
                            }
                        ]}
                        onPress={handleGoogleSignIn}
                        disabled={oauthLoading}
                        activeOpacity={0.7}
                    >
                        {/* Wrapper for Icon to ensure proper spacing/positioning */}
                        <View style={{ marginLeft: Spacing.sm, marginRight: Spacing.md }}>
                            <GoogleLogo width={20} height={20} />
                        </View>

                        <ThemedText
                            type="body"
                            style={{
                                color: '#3C4043',
                                fontWeight: '500',
                                flex: 1,
                                textAlign: 'center',
                                marginRight: Spacing.lg + 4
                            }}
                        >
                            {oauthLoading ? "Signing in..." : "Sign in with Google"}
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
