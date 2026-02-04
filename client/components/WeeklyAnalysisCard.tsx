import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { CircularProgress } from "@/components/CircularProgress";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";

interface WeeklyAnalysisCardProps {
  totalScans: number;
  improvementPercent: number;
  consistencyScore: number;
  isLocked: boolean;
  onPress?: () => void;
}

export function WeeklyAnalysisCard({
  totalScans,
  improvementPercent,
  consistencyScore,
  isLocked,
}: WeeklyAnalysisCardProps) {
  const { theme } = useTheme();

  if (isLocked) {
    return (
      <View style={[styles.lockedContainer, { backgroundColor: theme.backgroundDefault }]}>
        <Image
          source={require("../../assets/images/locked-report.png")}
          style={styles.lockedImage}
          resizeMode="contain"
        />
        <ThemedText type="h4" style={styles.lockedTitle}>
          Weekly Analysis Locked
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.lockedSubtitle, { color: theme.textSecondary }]}
        >
          Complete 5 days of scans to unlock
        </ThemedText>
        <View style={styles.progressInfo}>
          <Feather name="lock" size={wp('4%')} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
            {totalScans}/15 scans completed
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Weekly Analysis
      </ThemedText>
      <View style={styles.cardsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="camera" size={wp('6%')} color={theme.primary} />
          <ThemedText type="h3" style={styles.statValue}>
            {totalScans}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Scans This Week
          </ThemedText>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather
            name={improvementPercent >= 0 ? "trending-up" : "trending-down"}
            size={wp('6%')}
            color={improvementPercent >= 0 ? theme.success : theme.error}
          />
          <ThemedText
            type="h3"
            style={[
              styles.statValue,
              { color: improvementPercent >= 0 ? theme.success : theme.error },
            ]}
          >
            {improvementPercent >= 0 ? "+" : ""}
            {improvementPercent.toFixed(1)}%
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Since Last Week
          </ThemedText>
        </View>
      </View>

      <View style={[styles.consistencyCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.consistencyContent}>
          <View style={styles.consistencyText}>
            <ThemedText type="h4">Consistency Score</ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
            >
              Based on daily scan frequency
            </ThemedText>
          </View>
          <CircularProgress progress={consistencyScore} size={wp('25%')} strokeWidth={wp('2.5%')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  cardsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
  },
  statValue: {
    marginVertical: Spacing.sm,
  },
  consistencyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  consistencyContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  consistencyText: {
    flex: 1,
    paddingRight: Spacing.lg,
  },
  lockedContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  lockedImage: {
    width: wp('20%'),
    height: wp('20%'),
    marginBottom: Spacing.md,
    opacity: 0.6,
  },
  lockedTitle: {
    marginBottom: Spacing.xs,
  },
  lockedSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
});
