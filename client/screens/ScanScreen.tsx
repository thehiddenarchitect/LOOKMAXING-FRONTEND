import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  FlatList,
  ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ScanResultCard } from "@/components/ScanResultCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, getScoreColor, wp } from "@/constants/theme";
import {
  ScanRecord,
} from "@/lib/storage";
import { api } from "@/lib/api";
import { useData } from "@/context/DataContext";

type ScanStep = "history" | "select" | "captured" | "questions" | "result";

const ScanHistoryItem = React.memo(({
  scan,
  index,
  totalScans,
  onPress,
}: {
  scan: ScanRecord;
  index: number;
  totalScans: number;
  onPress: (scan: ScanRecord) => void;
}) => {
  const { theme } = useTheme();
  const scanNumber = totalScans - index;
  const date = new Date(scan.date);
  const formattedDate = `${date.getDate()} ${date.toLocaleString("en", { month: "short" })}`;

  return (
    <Pressable onPress={() => onPress(scan)}>
      <View style={[styles.historyItem, { backgroundColor: theme.backgroundDefault }]}>
        {scan.imageUri ? (
          <Image source={{ uri: scan.imageUri }} style={styles.historyImage} />
        ) : (
          <View style={[styles.historyImagePlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="user" size={wp('7%')} color={theme.textSecondary} />
          </View>
        )}

        <View style={styles.historyContent}>
          <ThemedText type="body" style={{ marginBottom: Spacing.xs }}>
            {formattedDate}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            OVERALL
          </ThemedText>
          <ThemedText
            type="h2"
            style={{ color: getScoreColor(scan.stats.overall) }}
          >
            {scan.stats.overall}
          </ThemedText>
        </View>

        <View style={styles.historyStats}>
          <View style={styles.statColumn}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              SYM
            </ThemedText>
            <ThemedText type="h4">{scan.stats.symmetry}</ThemedText>
          </View>
          <View style={styles.statColumn}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              JAW
            </ThemedText>
            <ThemedText type="h4">{scan.stats.jawline}</ThemedText>
          </View>
        </View>

        <View style={[styles.scanNumberBadge, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            #{scanNumber}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
});

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  // 1. Synchronous Global State Access
  const { scans, addScan, todayScans, dailyScanCount } = useData();

  const [step, setStep] = useState<ScanStep>("history");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanRecord | null>(null);

  // Local state for scan logic (limits) - Use persistent count
  const scansUsedToday = Math.max(todayScans.length, dailyScanCount);
  // Hardcoded limit for responsiveness
  const canScan = scansUsedToday < 3;

  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Input states for questionnaire (optional/hidden for now but kept for logic)
  const [sleepHours, setSleepHours] = useState("7");
  const [waterLiters, setWaterLiters] = useState("2");
  const [diet, setDiet] = useState("balanced");
  const [exercise, setExercise] = useState("light");

  const resultOpacity = useSharedValue(0);

  // Timer logic - Purely client side for instant feedback
  useEffect(() => {
    if (canScan) return;

    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("00:00:00");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [canScan]);


  const handlePickImage = async () => {
    if (!canScan) {
      Alert.alert(
        "Daily Limit Reached",
        "You can only do 3 scans per day. Come back tomorrow!"
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant camera roll permissions to scan your face."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setImageUri(result.assets[0].uri);
      setStep("captured");
    }
  };

  const handleTakePhoto = async () => {
    if (!canScan) {
      Alert.alert(
        "Daily Limit Reached",
        "You can only do 3 scans per day. Come back tomorrow!"
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant camera permissions to scan your face."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setImageUri(result.assets[0].uri);
      setStep("captured");
    }
  };

  const handleNewScan = () => {
    if (!canScan) {
      Alert.alert(
        "Daily Limit Reached",
        "You can only do 3 scans per day. Come back tomorrow!"
      );
      return;
    }
    setStep("select");
  };

  const handleRunAnalysis = async () => {
    if (!imageUri || isLoading) return;

    try {
      setIsLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Upload to API
      const result = await api.uploadScan(imageUri);

      const newScan: ScanRecord = {
        id: result.id,
        // Use local time for immediate 'today' consistency, backend date will sync on refresh
        date: new Date().toISOString(),
        imageUri: imageUri, // Keep local URI for display
        stats: {
          symmetry: result.metrics.symmetry,
          jawline: result.metrics.jawline,
          proportions: result.metrics.proportions,
          masculinity: result.metrics.masculinity,
          overall: result.overall_score,
          cheekbones: result.metrics.cheekbones || 0,
          skinClarity: result.metrics.skin_clarity
        },
        lifestyle: {
          sleep: parseInt(sleepHours, 10),
          water: parseFloat(waterLiters),
          diet,
          exercise,
        },
      };

      // OPTIMISTIC UPDATE via Context
      addScan(newScan);

      setLastScanResult(newScan);

      resultOpacity.value = withTiming(1, { duration: 300 }); // Faster animation
      setStep("result");
    } catch (error: any) {
      Alert.alert("Scan Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistoryItem = useCallback((scan: ScanRecord) => {
    setLastScanResult(scan);
    resultOpacity.value = 0;
    setStep("result");
    resultOpacity.value = withTiming(1, { duration: 300 }); // Faster animation
  }, [resultOpacity]);

  const handleReset = () => {
    setStep("history");
    setImageUri(null);
    setLastScanResult(null);
    resultOpacity.value = 0;
  };

  const animatedResultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
  }));

  const renderItem: ListRenderItem<ScanRecord> = useCallback(({ item, index }) => (
    <ScanHistoryItem
      scan={item}
      index={index}
      totalScans={scans.length}
      onPress={handleViewHistoryItem}
    />
  ), [scans.length, handleViewHistoryItem]);

  const renderHistoryState = () => (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <ThemedText type="h2">Scan History</ThemedText>
        <Pressable
          onPress={handleNewScan}
          disabled={!canScan}
          style={[
            styles.newScanButton,
            {
              backgroundColor: canScan ? theme.primary : theme.backgroundSecondary,
            },
          ]}
        >
          <Feather name="camera" size={wp('4.5%')} color={canScan ? "#FFFFFF" : theme.textSecondary} />
          <ThemedText
            type="body"
            style={{
              color: canScan ? "#FFFFFF" : theme.textSecondary,
              marginLeft: Spacing.sm,
              fontWeight: "600",
            }}
          >
            New Scan
          </ThemedText>
        </Pressable>
      </View>

      {!canScan ? (
        <View style={[styles.limitBanner, { backgroundColor: theme.warning + "20" }]}>
          <Feather name="alert-circle" size={wp('4%')} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.warning, marginLeft: Spacing.sm }}>
            Daily limit reached. Resets in {timeRemaining}
          </ThemedText>
        </View>
      ) : null}

      {scans.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="camera" size={wp('30%')} color={theme.textSecondary} />
          </View>
          <ThemedText type="h4" style={styles.emptyTitle}>
            No Scans Yet
          </ThemedText>

        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );

  const renderSelectState = () => (
    <View style={styles.selectContainer}>
      <ThemedText type="h3" style={styles.selectTitle}>
        New Scan
      </ThemedText>


      <View style={styles.selectButtons}>
        <Pressable
          onPress={handleTakePhoto}
          style={[styles.selectButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="camera" size={wp('8%')} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", marginTop: Spacing.md }}>
            Take Photo
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handlePickImage}
          style={[
            styles.selectButton,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
        >
          <Feather name="image" size={wp('8%')} color={theme.primary} />
          <ThemedText type="body" style={{ color: theme.text, marginTop: Spacing.md }}>
            From Gallery
          </ThemedText>
        </Pressable>
      </View>

      <Pressable onPress={handleReset} style={styles.cancelButton}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Cancel
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderCapturedState = () => (
    <View style={[styles.capturedContainer, { position: 'relative' }]}>
      {/* 1. Top Back Button */}
      <Pressable
        onPress={handleReset}
        style={{
          position: 'absolute',
          top: 0,
          left: Spacing.lg,
          zIndex: 10,
          padding: Spacing.sm
        }}
        hitSlop={20}
      >
        <Feather name="arrow-left" size={24} color={theme.textSecondary} style={{ opacity: 0.6 }} />
      </Pressable>

      <ThemedText type="h2" style={styles.capturedTitle}>
        Scan Ready
      </ThemedText>

      <Image source={{ uri: imageUri! }} style={styles.capturedImage} />



      <View style={styles.capturedButtons}>
        <Button
          onPress={handleRunAnalysis}
          style={styles.primaryButton}
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? "Analyzing..." : "Run Analysis"}
        </Button>
      </View>

      <Pressable
        onPress={handleReset}
        style={styles.retakeButton}
      >
        <ThemedText type="small" style={{ color: theme.textSecondary, textDecorationLine: 'underline' }}>
          Retake Photo
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderQuestionsState = () => (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1 }}
      contentContainerStyle={[styles.questionsContainer, { justifyContent: 'center', flex: 1 }]}
    >
      <Button onPress={handleRunAnalysis} style={styles.analyzeButton}>
        Run Analysis
      </Button>
    </KeyboardAwareScrollViewCompat>
  );

  const renderResultState = () => {
    if (!lastScanResult) return null;

    return (
      <Animated.ScrollView
        style={animatedResultStyle}
        contentContainerStyle={styles.resultContainer}
      >
        <ThemedText type="h4" style={styles.resultTitle}>
          Your Analysis Results
        </ThemedText>

        <ScanResultCard
          stats={lastScanResult.stats}
          imageUri={lastScanResult.imageUri}
        />

        <Button onPress={handleReset} style={styles.newScanButtonBottom}>
          Back to History
        </Button>
      </Animated.ScrollView>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: Spacing.lg,
        },
      ]}
    >
      {step === "history" ? renderHistoryState() : null}
      {step === "select" ? renderSelectState() : null}
      {step === "captured" ? renderCapturedState() : null}
      {step === "questions" ? renderQuestionsState() : null}
      {step === "result" ? renderResultState() : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  newScanButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  historyImage: {
    width: wp('18%'),
    height: wp('18%'),
    borderRadius: BorderRadius.sm,
  },
  historyImagePlaceholder: {
    width: wp('18%'),
    height: wp('18%'),
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  historyStats: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginRight: Spacing.md,
  },
  statColumn: {
    alignItems: "center",
  },
  scanNumberBadge: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: wp('26%'),
    height: wp('26%'),
    borderRadius: wp('13%'),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    textAlign: "center",
  },
  capturedContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  capturedImage: {
    width: wp('65%'),
    height: wp('65%'),
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  capturedTitle: {
    marginBottom: Spacing.sm,
  },
  capturedSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  capturedButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%", // Added width 100% to fill container
  },
  outlineButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1,
    // removed backgroundColor override, will use default (theme.link/primary) from Button component or theme
  },
  questionsContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["4xl"],
  },
  questionsTitle: {
    marginBottom: Spacing.xs,
  },
  questionsSubtitle: {
    marginBottom: Spacing.xl,
  },
  questionCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  questionLabel: {
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wideChip: {
    paddingHorizontal: Spacing.md,
  },
  analyzeButton: {
    marginTop: Spacing.lg,
  },
  resultContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["4xl"],
  },
  resultTitle: {
    marginBottom: Spacing.lg,
  },
  newScanButtonBottom: {
    marginTop: Spacing.xl,
  },
  selectContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  selectTitle: {
    marginBottom: Spacing.sm,
  },
  selectSubtitle: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  selectButtons: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  selectButton: {
    width: wp('37%'),
    height: wp('37%'),
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    marginTop: Spacing["3xl"],
    padding: Spacing.lg,
  },
  confirmationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  retakeButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
});
