import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, getScoreColor, wp } from "@/constants/theme";
import { FacialStats } from "@/lib/storage";

interface DailyReportCardProps {
  isLocked: boolean;
  scansToday: number;
  averageStats?: FacialStats;
}

const DAILY_TIPS = [
  "Apply moisturizer before bedtime",
  "Drink at least 2L of water today",
  "Practice mewing for 10 minutes",
  "Do facial stretches in the morning",
  "Get 8 hours of quality sleep",
  "Avoid touching your face",
  "Apply sunscreen before going outside",
];

const getStatus = (value: number) => {
  if (value > 80) return { text: "STRONG", label: "Elite Tier" };
  if (value <= 60) return { text: "WEAK", label: "Needs Work" };
  return { text: "AVERAGE", label: "Decent" };
};

const ReportStatCard = React.memo(({ label, value }: { label: string; value: number }) => {
  const { theme } = useTheme();
  const color = getScoreColor(value);
  const { text, label: statusLabel } = getStatus(value);

  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
      <ThemedText type="body" style={{ color: theme.text, marginBottom: Spacing.xs, fontWeight: '600' }}>
        {label}
      </ThemedText>
      <ThemedText type="h1" style={[styles.statValue, { color: theme.text }]}>
        {Math.round(value)}
      </ThemedText>

      <View style={styles.cardFooter}>
        <View style={styles.footerRow}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {statusLabel}
          </ThemedText>
          <ThemedText type="small" style={{ color }}>
            {text}
          </ThemedText>
        </View>
        <ProgressBar progress={value} height={wp('1%')} color={color} />
      </View>
    </View>
  );
});

export const DailyReportCard = React.memo(function DailyReportCard({
  isLocked,
  scansToday,
  averageStats,
}: DailyReportCardProps) {
  const { theme } = useTheme();

  if (isLocked) {
    return (
      <View style={styles.container}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Daily Average
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
          Average of today's scans
        </ThemedText>

        <View style={[styles.lockedCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.lockedIconContainer}>
            <Feather name="lock" size={wp('8.5%')} color={theme.textSecondary} />
          </View>
          <ThemedText type="h4" style={styles.lockedTitle}>
            Report Locked
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.lockedSubtitle, { color: theme.textSecondary }]}
          >
            Complete 3 scans to reveal your daily average
          </ThemedText>
          <View style={styles.progressInfo}>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              {scansToday}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {" "}/ 3 scans
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  if (!averageStats) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Daily Average
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
        Average of today's scans
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}
      >
        <ReportStatCard label="Overall Score" value={averageStats.overall} />
        <ReportStatCard label="Masculinity" value={averageStats.masculinity} />
        <ReportStatCard label="Jawline" value={averageStats.jawline} />
        <ReportStatCard label="Symmetry" value={averageStats.symmetry} />
        <ReportStatCard label="Skin Quality" value={averageStats.skinClarity} />
        <ReportStatCard label="Cheekbones" value={averageStats.cheekbones || 0} />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  statCard: {
    width: wp('42%'),
    minHeight: wp('42%'),
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  statValue: {
    fontSize: wp('10%'),
    lineHeight: wp('12%'),
    fontWeight: "700",
  },
  cardFooter: {
    width: "100%",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  tipSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  lockedCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  lockedIconContainer: {
    width: wp('18.5%'),
    height: wp('18.5%'),
    borderRadius: wp('9.25%'),
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  lockedTitle: {
    marginBottom: Spacing.xs,
  },
  lockedSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "baseline",
  },
});
