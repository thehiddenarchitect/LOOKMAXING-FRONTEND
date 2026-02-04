import React, { useState, useMemo } from "react";
import { View, StyleSheet, Image, TextInput, Pressable, Alert, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { StorageService, UserProfile } from "@/lib/storage"; // Kept only for explicit clears if needed, or moved to context
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";



function calculateBMI(height?: number, weight?: number) {
  if (!height || !weight || height <= 0 || weight <= 0) return null;
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);

  let category = "Normal";
  let color = "#22C55E"; // Green

  if (bmi < 18.5) {
    category = "Underweight";
    color = "#F59E0B"; // Yellow/Orange
  } else if (bmi >= 25 && bmi < 30) {
    category = "Above Optimal";
    color = "#F59E0B";
  } else if (bmi >= 30) {
    category = "High";
    color = "#EF4444"; // Red
  }

  return { score: bmi.toFixed(1), category, color };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { signOut } = useAuth();

  // 1. Consume Global State
  const { profile, scans, updateProfile, refreshData } = useData();

  // Local editable state
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile || {
    name: "",
    age: 0,
    gender: "male",
    height: undefined,
    weight: undefined,
    avatarUri: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync local state if profile loads later (initial load)
  React.useEffect(() => {
    if (profile) {
      setLocalProfile(prev => ({
        ...prev,
        ...profile
      }));
    }
  }, [profile]);

  // Validation Logic (Same as Signup)
  const REGEX_NAME = /^[A-Za-z ]{2,30}$/;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Name
    if (!localProfile.name || !REGEX_NAME.test(localProfile.name)) {
      newErrors.name = "Name must be 2-30 alphabets/spaces only";
    }

    // Age
    if (!localProfile.age || localProfile.age < 13 || localProfile.age > 100) {
      newErrors.age = "Age must be 13-100";
    }

    // Height
    if (localProfile.height !== undefined) {
      if (localProfile.height < 100 || localProfile.height > 250) {
        newErrors.height = "Height must be 100-250 cm";
      }
    }

    // Weight
    if (localProfile.weight !== undefined) {
      if (localProfile.weight < 30 || localProfile.weight > 300) {
        newErrors.weight = "Weight must be 30-300 kg";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Run validation on every change
  React.useEffect(() => {
    validate();
  }, [localProfile]);


  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);

  // 2. Consume persistent lifetime stats (Activity Overview)
  const { lifetimeStats } = useData();

  const activityStats = useMemo(() => {
    if (lifetimeStats) return lifetimeStats;

    // Fallback to scans if lifetime stats not yet loaded/migrated
    const totalScans = scans.length;
    const uniqueDays = new Set(scans.map(s => new Date(s.date).toDateString())).size;
    const lastScanDate = scans.length > 0 ? new Date(scans[0].date).toLocaleDateString() : "Never";

    return {
      totalScans,
      daysActive: uniqueDays,
      lastScanDate
    };
  }, [scans, lifetimeStats]);


  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newUri = result.assets[0].uri;
      const updated = { ...localProfile, avatarUri: newUri };
      setLocalProfile(updated);

      // Update Context & Persist immediately
      updateProfile(updated);
    }
  };

  const handleSavePersonal = async () => {
    if (!validate()) {
      Alert.alert("Invalid Input", "Please correct the errors before saving.");
      return;
    }

    setIsSavingPersonal(true);
    // Commit to context + storage
    updateProfile(localProfile);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSavingPersonal(false);
    Alert.alert("Saved", "Personal information updated.");
  };

  const handleSaveMetrics = async () => {
    if (!validate()) { // Re-check
      Alert.alert("Invalid Input", "Please correct errors.");
      return;
    }

    setIsSavingMetrics(true);
    // Commit to context + storage
    updateProfile(localProfile);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSavingMetrics(false);
    Alert.alert("Saved", "Body metrics updated.");
  };

  const handleClearData = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm("This will permanently delete your scan history from this device.\nClearing history may affect future analysis and next week’s results.\nThis action cannot be undone.")) {
        await performResetHistory();
      }
    } else {
      Alert.alert(
        "Clear Data Warning ⚠️",
        "This will permanently delete your scan history from this device.\nClearing history may affect future analysis and next week’s results.\nThis action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reset History",
            style: "destructive",
            onPress: performResetHistory,
          },
        ]
      );
    }
  };

  const performResetHistory = async () => {
    await StorageService.clearHistoryOnly();
    await refreshData();

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setTimeout(() => {
      if (Platform.OS === 'web') {
        window.alert("History has been reset.");
      } else {
        Alert.alert("Done", "History has been reset.");
      }
    }, 100);
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to sign out?")) {
        await signOut();
      }
    } else {
      Alert.alert(
        "Log Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log Out",
            style: "destructive",
            onPress: async () => {
              await signOut();
            }
          }
        ]
      );
    }
  };

  const bmiData = calculateBMI(localProfile.height, localProfile.weight);

  const shouldDisablePersonal = !!errors.name || !!errors.age;
  const shouldDisableMetrics = !!errors.height || !!errors.weight;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      {/* Header Profile */}
      <View style={styles.headerSection}>
        <Pressable onPress={handlePickAvatar} style={styles.avatarContainer}>
          <Image
            source={
              localProfile.avatarUri
                ? { uri: localProfile.avatarUri }
                : require("../../assets/images/avatar-default.png")
            }
            style={styles.avatar}
          />
          <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
            <Feather name="camera" size={wp('3.5%')} color="#FFFFFF" />
          </View>
        </Pressable>
        <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>
          {localProfile.name || "User"}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          LookMax Member
        </ThemedText>
      </View>

      {/* 1. Personal Information */}
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h4" style={styles.cardTitle}>Personal Information</ThemedText>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Name</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.name ? theme.error : theme.border }]}
            value={localProfile.name}
            onChangeText={(text) => setLocalProfile(p => ({ ...p, name: text }))}
            placeholder="Ex. John Doe"
            placeholderTextColor={theme.textSecondary}
          />
          {errors.name && <ThemedText type="small" style={{ color: theme.error, marginTop: 4 }}>{errors.name}</ThemedText>}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Age</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.age ? theme.error : theme.border }]}
              value={localProfile.age > 0 ? String(localProfile.age) : ""}
              onChangeText={(text) => setLocalProfile(p => ({ ...p, age: parseInt(text) || 0 }))}
              keyboardType="number-pad"
              placeholder="13-100"
              placeholderTextColor={theme.textSecondary}
              maxLength={3}
            />
            {errors.age && <ThemedText type="small" style={{ color: theme.error, marginTop: 4 }}>{errors.age}</ThemedText>}
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Gender</ThemedText>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, localProfile.gender === 'male' && { backgroundColor: theme.primary }]}
                onPress={() => setLocalProfile(p => ({ ...p, gender: 'male' }))}
              >
                <ThemedText type="small" style={{ color: localProfile.gender === 'male' ? '#FFF' : theme.textSecondary }}>M</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, localProfile.gender === 'female' && { backgroundColor: theme.primary }]}
                onPress={() => setLocalProfile(p => ({ ...p, gender: 'female' }))}
              >
                <ThemedText type="small" style={{ color: localProfile.gender === 'female' ? '#FFF' : theme.textSecondary }}>F</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Button
          onPress={handleSavePersonal}
          disabled={isSavingPersonal || shouldDisablePersonal}
          style={{ marginTop: Spacing.sm, opacity: (isSavingPersonal || shouldDisablePersonal) ? 0.5 : 1 }}
        >
          Save Changes
        </Button>
        <ThemedText type="small" style={styles.helperText}>Used to personalize analysis and recommendations.</ThemedText>
      </View>

      {/* 2. Body Metrics */}
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h4" style={styles.cardTitle}>Body Metrics</ThemedText>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Height (cm)</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.height ? theme.error : theme.border }]}
              value={localProfile.height ? String(localProfile.height) : ""}
              onChangeText={(text) => setLocalProfile(p => ({ ...p, height: parseFloat(text) || undefined }))}
              keyboardType="numeric"
              placeholder="100-250"
              placeholderTextColor={theme.textSecondary}
              maxLength={3}
            />
            {errors.height && <ThemedText type="small" style={{ color: theme.error, marginTop: 4 }}>{errors.height}</ThemedText>}
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Weight (kg)</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: errors.weight ? theme.error : theme.border }]}
              value={localProfile.weight ? String(localProfile.weight) : ""}
              onChangeText={(text) => setLocalProfile(p => ({ ...p, weight: parseFloat(text) || undefined }))}
              keyboardType="numeric"
              placeholder="30-300"
              placeholderTextColor={theme.textSecondary}
              maxLength={3}
            />
            {errors.weight && <ThemedText type="small" style={{ color: theme.error, marginTop: 4 }}>{errors.weight}</ThemedText>}
          </View>
        </View>

        <Button
          onPress={handleSaveMetrics}
          disabled={isSavingMetrics || shouldDisableMetrics}
          style={{ marginTop: Spacing.sm, opacity: (isSavingMetrics || shouldDisableMetrics) ? 0.5 : 1 }}
        >
          Save Changes
        </Button>
        <ThemedText type="small" style={styles.helperText}>These values are used to calculate BMI and improve accuracy.</ThemedText>
      </View>

      {/* 3. Body Analysis (Read-Only) */}
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h4" style={styles.cardTitle}>Body Analysis</ThemedText>

        {bmiData ? (
          <View style={styles.bmiContainer}>
            <View>
              <ThemedText type="h1" style={{ color: bmiData.color }}>{bmiData.score}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>BMI Score</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="h3" style={{ color: bmiData.color }}>{bmiData.category}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Category</ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText type="body" style={{ color: theme.textSecondary, fontStyle: 'italic', marginBottom: Spacing.md }}>
            Enter height and weight to see analysis.
          </ThemedText>
        )}

        {/* Visual Scale */}
        <View style={styles.bmiScale}>
          <View style={[styles.bmiSegment, { backgroundColor: '#3B82F6', flex: 1, borderTopLeftRadius: wp('1%'), borderBottomLeftRadius: wp('1%') }]} />
          <View style={[styles.bmiSegment, { backgroundColor: '#22C55E', flex: 1.5 }]} />
          <View style={[styles.bmiSegment, { backgroundColor: '#F59E0B', flex: 1 }]} />
          <View style={[styles.bmiSegment, { backgroundColor: '#EF4444', flex: 1, borderTopRightRadius: wp('1%'), borderBottomRightRadius: wp('1%') }]} />
        </View>
      </View>

      {/* 4. Activity Overview */}
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h4" style={styles.cardTitle}>Activity Overview</ThemedText>

        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <ThemedText type="h3">{activityStats.totalScans}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Scans</ThemedText>
          </View>
          <View style={styles.activityItem}>
            <ThemedText type="h3">{activityStats.daysActive}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Days Active</ThemedText>
          </View>
          <View style={styles.activityItem}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>{activityStats.lastScanDate}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Last Scan</ThemedText>
          </View>
        </View>
        <ThemedText type="small" style={styles.helperText}>All activity metrics are auto-synced and cannot be edited.</ThemedText>
      </View>

      {/* 5. Data & Privacy */}
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h4" style={styles.cardTitle}>Data & Privacy</ThemedText>

        <TouchableOpacity
          style={[styles.dangerButton, { borderColor: theme.error }]}
          onPress={handleClearData}
        >
          <Feather name="trash-2" size={wp('4.5%')} color={theme.error} style={{ marginRight: Spacing.xs }} />
          <ThemedText type="body" style={{ color: theme.error, fontWeight: '600' }}>
            Reset History
          </ThemedText>
        </TouchableOpacity>
        <ThemedText type="small" style={styles.helperText}>
          Permanently delete all scans and history. Profile data will be kept.
        </ThemedText>
      </View>

      {/* 6. App Info */}
      <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
        <ThemedText type="body" style={{ fontWeight: '600' }}>LookMax</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>v1.0.0 • Production</ThemedText>

        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg }}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={wp('4%')} color={theme.textSecondary} style={{ marginRight: Spacing.xs }} />
          <ThemedText type="body" style={{ color: theme.textSecondary }}>Log Out</ThemedText>
        </TouchableOpacity>
      </View>

    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: wp('26.5%'),
    height: wp('26.5%'),
    borderRadius: wp('13.25%'),
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: wp('8.5%'),
    height: wp('8.5%'),
    borderRadius: wp('4.25%'),
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  input: {
    minHeight: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: wp('4.25%'),
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  helperText: {
    color: "#6B7280", // hardcoded secondary/tertiary look
    marginTop: Spacing.sm,
    fontStyle: 'italic',
    fontSize: wp('3.2%'),
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  genderBtn: {
    flex: 1,
    minHeight: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
  },
  bmiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bmiScale: {
    flexDirection: 'row',
    height: wp('2%'),
    borderRadius: wp('1%'),
    overflow: 'hidden',
  },
  bmiSegment: {
    height: '100%',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityItem: {
    alignItems: 'center',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
