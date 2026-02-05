import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { StorageService } from "@/lib/storage";
import { api } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";

const REGEX_NAME = /^[A-Za-z ]{2,30}$/;

/**
 * ProfileCompletionScreen
 * 
 * This screen is shown to OAuth users (Google sign-in) who have authenticated
 * but haven't completed their profile yet. It collects:
 * - Personal info (name, age, gender) - Step 1
 * - Body metrics (height, weight) - Step 2
 * - Review & Save - Step 3
 */
export default function ProfileCompletionScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { updateProfile, refreshData } = useData();
    const { user } = useAuth();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Pre-fill name from OAuth metadata if available
    const oauthName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";

    // Form Data
    const [name, setName] = useState(oauthName);
    const [age, setAge] = useState("");
    const [gender, setGender] = useState<"male" | "female" | "prefer_not_to_say">("male");

    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Update name if OAuth data loads later
    useEffect(() => {
        if (oauthName && !name) {
            setName(oauthName);
        }
    }, [oauthName]);

    // Validation Logic
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

            setStep(2);
        } else if (step === 2) {
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

            setStep(3);
        }
    };

    const handleComplete = async () => {
        // Final full validation
        const errs: Record<string, string> = {};
        const addErr = (field: string, msg: string | null) => { if (msg) errs[field] = msg; };

        addErr('name', validateName(name));
        addErr('age', validateAge(age));
        addErr('height', validateHeight(height));
        addErr('weight', validateWeight(weight));

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            Alert.alert("Validation Error", "Please correct the errors before continuing.");
            return;
        }

        if (!name || !age || !height || !weight) {
            Alert.alert("Missing Fields", "Please ensure all details are filled.");
            return;
        }

        setLoading(true);
        try {
            const newProfile = {
                name,
                age: parseInt(age, 10),
                gender,
                height: parseInt(height, 10),
                weight: parseInt(weight, 10)
            };

            // Try to save to backend (non-blocking, can fail)
            try {
                await api.saveProfile(newProfile);
                console.log("Profile saved to backend successfully");
            } catch (backendError: any) {
                // Backend might fail but we can still proceed with local storage
                console.warn("Backend profile save failed (will retry later):", backendError.message);
            }

            // Always save to local storage - this is what the app uses
            await StorageService.saveProfile(newProfile);
            console.log("Profile saved to local storage");

            // Update context (this will trigger navigation change to Main)
            updateProfile(newProfile);

            // Refresh data to ensure profile is loaded
            await refreshData();

        } catch (e: any) {
            console.error("Profile completion error:", e);
            Alert.alert("Error", e.message || "Failed to save profile. Please try again.");
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
            <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>Complete Your Profile</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
                Let's personalize your experience with a few details.
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

    const renderStep2 = () => (
        <View>
            <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>Body Metrics</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
                These values help us provide accurate analysis.
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

    const renderStep3 = () => (
        <View>
            <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>All Set!</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
                Review your details to start your transformation.
            </ThemedText>

            <View style={[styles.previewCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Name</ThemedText>
                    <ThemedText type="body">{name}</ThemedText>
                </View>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Age</ThemedText>
                    <ThemedText type="body">{age}</ThemedText>
                </View>
                <View style={styles.previewRow}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Gender</ThemedText>
                    <ThemedText type="body">{gender === "prefer_not_to_say" ? "Not specified" : gender}</ThemedText>
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

    const totalSteps = 3;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
            contentContainerStyle={{
                flexGrow: 1,
                paddingTop: insets.top + Spacing.xl,
                paddingBottom: insets.bottom + Spacing.xl,
                paddingHorizontal: Spacing.lg,
            }}
        >
            {/* Progress */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.backgroundTertiary }]}>
                    <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${(step / totalSteps) * 100}%` }]} />
                </View>
                <ThemedText type="label" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'right' }}>
                    Step {step} of {totalSteps}
                </ThemedText>
            </View>

            <View style={{ flex: 1, justifyContent: "center" }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </View>

            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity onPress={() => setStep(step - 1)} style={{ padding: Spacing.md, marginRight: Spacing.md }}>
                        <ThemedText type="body" style={{ color: theme.textSecondary }}>Back</ThemedText>
                    </TouchableOpacity>
                )}

                <Button
                    onPress={step === totalSteps ? handleComplete : handleNext}
                    disabled={loading}
                    style={{ flex: 1, opacity: loading ? 0.5 : 1 }}
                >
                    {loading ? "Saving..." : step === totalSteps ? "Let's Go!" : "Next"}
                </Button>
            </View>
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
