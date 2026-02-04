import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { StorageService } from "@/lib/storage";
import { api } from "@/lib/api";

const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
const REGEX_NAME = /^[A-Za-z ]{2,30}$/;

export default function SignupScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const navigation = useNavigation<any>();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState<"male" | "female" | "prefer_not_to_say">("male");

    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Validation Logic - Refactored to "Calm" mode (onBlur)

    const validateEmail = (val: string) => {
        if (!val) return null; // Don't show error if empty, just wait
        if (val.includes(' ')) return "Email must not contain spaces";
        if (!REGEX_EMAIL.test(val)) return "Invalid email address";
        return null;
    };

    const validatePassword = (val: string) => {
        if (!val) return null;
        if (val.includes(' ')) return "No spaces allowed";
        if (!REGEX_PASSWORD.test(val)) return "Minimum 8 characters, including 1 uppercase letter and 1 number.";
        return null;
    };

    const validateConfirmPassword = (val: string, original: string) => {
        if (!val) return null;
        if (val !== original) return "Passwords do not match";
        return null;
    };

    const validateName = (val: string) => {
        if (!val) return null;
        if (!REGEX_NAME.test(val)) return "Only alphabets & spaces, 2-30 chars";
        return null;
    };

    const validateAge = (val: string) => {
        if (!val) return null;
        const ageNum = parseInt(val);
        if (!/^\d+$/.test(val)) return "Numbers only";
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 100) return "Age must be 13-100";
        return null;
    };

    const validateHeight = (val: string) => {
        if (!val) return null;
        const hNum = parseFloat(val);
        if (!/^\d+$/.test(val)) return "Integers only (cm)";
        if (isNaN(hNum) || hNum < 100 || hNum > 250) return "Height must be 100-250 cm";
        return null;
    };

    const validateWeight = (val: string) => {
        if (!val) return null;
        const wNum = parseFloat(val);
        if (!/^\d+$/.test(val)) return "Integers only (kg)";
        if (isNaN(wNum) || wNum < 30 || wNum > 300) return "Weight must be 30-300 kg";
        return null;
    };

    const handleBlur = (field: string) => {
        let error = null;
        switch (field) {
            case 'email':
                error = validateEmail(email);
                break;
            case 'password':
                error = validatePassword(password);
                break;
            case 'confirmPassword':
                error = validateConfirmPassword(confirmPassword, password);
                break;
            case 'name':
                error = validateName(name);
                break;
            case 'age':
                error = validateAge(age);
                break;
            case 'height':
                error = validateHeight(height);
                break;
            case 'weight':
                error = validateWeight(weight);
                break;
        }

        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[field] = error;
            } else {
                delete newErrors[field];
            }
            return newErrors;
        });
    };



    const calculateBMI = () => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            const hM = h / 100;
            return (w / (hM * hM)).toFixed(1);
        }
        return "-";
    };

    const bmi = calculateBMI();

    const handleNext = () => {
        let currentErrors: Record<string, string> = {};

        if (step === 1) {
            const e1 = validateEmail(email); if (e1) currentErrors.email = e1;
            const e2 = validatePassword(password); if (e2) currentErrors.password = e2;
            const e3 = validateConfirmPassword(confirmPassword, password); if (e3) currentErrors.confirmPassword = e3;

            if (Object.keys(currentErrors).length > 0 || !email || !password || !confirmPassword) {
                setErrors(prev => ({ ...prev, ...currentErrors }));
                if (Object.keys(currentErrors).length > 0) return; // Stop if explicit errors
            }
            // Ensure all fields filled
            if (!email || !password || !confirmPassword) {
                Alert.alert("Missing Fields", "Please fill in all fields.");
                return;
            }

            setStep(2);
        } else if (step === 2) {
            const e1 = validateName(name); if (e1) currentErrors.name = e1;
            const e2 = validateAge(age); if (e2) currentErrors.age = e2;

            if (Object.keys(currentErrors).length > 0 || !name || !age) {
                setErrors(prev => ({ ...prev, ...currentErrors }));
                if (Object.keys(currentErrors).length > 0) return;
            }
            if (!name || !age) {
                Alert.alert("Missing Fields", "Please fill in all fields.");
                return;
            }

            setStep(3);
        } else if (step === 3) {
            const e1 = validateHeight(height); if (e1) currentErrors.height = e1;
            const e2 = validateWeight(weight); if (e2) currentErrors.weight = e2;

            if (Object.keys(currentErrors).length > 0 || !height || !weight) {
                setErrors(prev => ({ ...prev, ...currentErrors }));
                if (Object.keys(currentErrors).length > 0) return;
            }
            if (!height || !weight) {
                Alert.alert("Missing Fields", "Please fill in all fields.");
                return;
            }

            setStep(4);
        }
    };

    const handleSignup = async () => {
        // Final full validation
        const errs: Record<string, string> = {};
        const addErr = (field: string, msg: string | null) => { if (msg) errs[field] = msg; };

        addErr('email', validateEmail(email));
        addErr('password', validatePassword(password));
        addErr('confirmPassword', validateConfirmPassword(confirmPassword, password));
        addErr('name', validateName(name));
        addErr('age', validateAge(age));
        addErr('height', validateHeight(height));
        addErr('weight', validateWeight(weight));

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            Alert.alert("Validation Error", "Please correct the errors before signing up.");
            return;
        }

        if (!email || !password || !name || !age || !height || !weight) {
            Alert.alert("Missing Fields", "Please ensure all details are filled.");
            return;
        }

        setLoading(true);
        try {
            await api.signUp({
                email,
                password,
                name,
                age: parseInt(age, 10),
                gender,
                height: parseInt(height, 10), // Ensure int
                weight: parseInt(weight, 10) // Ensure int
            });

            // Optimistic Update
            const newProfile = {
                name,
                age: parseInt(age, 10),
                gender,
                height: parseInt(height, 10),
                weight: parseInt(weight, 10)
            };
            await StorageService.saveProfile(newProfile);

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

        } catch (e: any) {
            if (e.message && (e.message.includes("registered") || e.message.includes("exists"))) {
                // Auto-login fallback
                const newProfile = {
                    name,
                    age: parseInt(age, 10),
                    gender,
                    height: parseInt(height, 10),
                    weight: parseInt(weight, 10)
                };
                await StorageService.saveProfile(newProfile);

                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (loginError) {
                    Alert.alert("Account Exists", "This email is already registered. Please login.", [
                        { text: "Go to Login", onPress: () => navigation.navigate("Login") }
                    ]);
                }
            } else {
                Alert.alert("Signup Failed", e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const renderInputError = (field: string) => {
        if (errors[field]) {
            return (
                <ThemedText type="small" style={{ color: theme.error, marginTop: 4 }}>
                    {errors[field]}
                </ThemedText>
            );
        }
        return null;
    };

    const renderStep1 = () => (
        <View>
            <ThemedText type="h2" style={{ marginBottom: Spacing.xl }}>Create Account</ThemedText>

            <View style={styles.inputGroup}>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Email</ThemedText>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.email ? theme.error : theme.border }]}
                    placeholder="Enter email"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => handleBlur('email')}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {renderInputError("email")}
            </View>
            <View style={styles.inputGroup}>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Password</ThemedText>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.password ? theme.error : theme.border }]}
                    placeholder="Enter password"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    onBlur={() => handleBlur('password')}
                    secureTextEntry
                />
                {renderInputError("password")}
            </View>
            <View style={styles.inputGroup}>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Confirm Password</ThemedText>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.confirmPassword ? theme.error : theme.border }]}
                    placeholder="Confirm password"
                    placeholderTextColor={theme.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onBlur={() => handleBlur('confirmPassword')}
                    secureTextEntry
                />
                {renderInputError("confirmPassword")}
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View>
            <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>Personal Info</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
                Used to personalize analysis and recommendations.
            </ThemedText>

            <View style={styles.inputGroup}>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Name</ThemedText>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.name ? theme.error : theme.border }]}
                    placeholder="Your name"
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                    onBlur={() => handleBlur('name')}
                />
                {renderInputError("name")}
            </View>
            <View style={styles.inputGroup}>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Age</ThemedText>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.age ? theme.error : theme.border }]}
                    placeholder="13-100"
                    placeholderTextColor={theme.textSecondary}
                    value={age}
                    onChangeText={setAge}
                    onBlur={() => handleBlur('age')}
                    keyboardType="number-pad"
                    maxLength={3}
                />
                {renderInputError("age")}
            </View>

            <View style={styles.inputGroup}>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Gender</ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    {(["male", "female", "prefer_not_to_say"] as const).map(g => (
                        <TouchableOpacity
                            key={g}
                            style={[
                                styles.genderBtn,
                                { borderColor: theme.border, backgroundColor: gender === g ? theme.primary : theme.backgroundSecondary }
                            ]}
                            onPress={() => setGender(g)}
                        >
                            <ThemedText type="small" style={{ color: gender === g ? '#FFF' : theme.textSecondary }}>
                                {g === "prefer_not_to_say" ? "Other" : g.charAt(0).toUpperCase() + g.slice(1)}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View>
            <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>Body Metrics</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
                These values are used to calculate BMI and improve accuracy.
            </ThemedText>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                    <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Height (cm)</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.height ? theme.error : theme.border }]}
                        value={height}
                        onChangeText={setHeight}
                        onBlur={() => handleBlur('height')}
                        keyboardType="numeric"
                        placeholder="100-250"
                        placeholderTextColor={theme.textSecondary}
                        maxLength={3}
                    />
                    {renderInputError("height")}
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Weight (kg)</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.weight ? theme.error : theme.border }]}
                        value={weight}
                        onChangeText={setWeight}
                        onBlur={() => handleBlur('weight')}
                        keyboardType="numeric"
                        placeholder="30-300"
                        placeholderTextColor={theme.textSecondary}
                        maxLength={3}
                    />
                    {renderInputError("weight")}
                </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: Spacing.lg }}>
                <ThemedText type="h1" style={{ color: theme.primary }}>{bmi}</ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>Estimated BMI</ThemedText>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View>
            <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>Almost Done</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
                Review your details to start your transformation.
            </ThemedText>

            <View style={[styles.previewCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Name</ThemedText>
                    <ThemedText type="body">{name}</ThemedText>
                </View>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Email</ThemedText>
                    <ThemedText type="body">{email}</ThemedText>
                </View>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Height</ThemedText>
                    <ThemedText type="body">{height} cm</ThemedText>
                </View>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Weight</ThemedText>
                    <ThemedText type="body">{weight} kg</ThemedText>
                </View>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>BMI</ThemedText>
                    <ThemedText type="body" style={{ color: theme.primary }}>{bmi}</ThemedText>
                </View>
            </View>
        </View>
    );

    // Disable logic - Just check if empty, strict validation happens on Next/Blur
    const isNextDisabled = false; // Always enabled to allow validation feedback on press


    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
            contentContainerStyle={{
                flexGrow: 1,
                paddingTop: Spacing.xl,
                paddingBottom: insets.bottom + Spacing.xl,
                paddingHorizontal: Spacing.lg,
            }}
        >
            {/* Progress */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.backgroundTertiary }]}>
                    <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${(step / 4) * 100}%` }]} />
                </View>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'right' }}>
                    Step {step} of 4
                </ThemedText>
            </View>

            <View style={{ flex: 1, justifyContent: "center" }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </View>

            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity onPress={() => setStep(step - 1)} style={{ padding: Spacing.md, marginRight: Spacing.md }}>
                        <ThemedText type="body" style={{ color: theme.textSecondary }}>Back</ThemedText>
                    </TouchableOpacity>
                )}

                <Button
                    onPress={step === 4 ? handleSignup : handleNext}
                    disabled={loading || isNextDisabled} // Strict disable
                    style={{ flex: 1, opacity: (loading || isNextDisabled) ? 0.5 : 1 }}
                >
                    {loading ? "Creating Account..." : step === 4 ? "Complete Signup" : "Next"}
                </Button>
            </View>

            {step === 1 && (
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: Spacing.xl }}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>
                        Already have an account?{" "}
                    </ThemedText>
                    <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                        <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                            Login
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    progressContainer: {
        marginBottom: Spacing["2xl"],
    },
    progressBar: {
        height: wp('1.5%'),
        borderRadius: wp('0.75%'),
        width: '100%',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
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
    genderBtn: {
        flex: 1,
        minHeight: Spacing.inputHeight,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: "row",
        marginBottom: Spacing.md,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing["2xl"],
    },
    previewCard: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    }
});
