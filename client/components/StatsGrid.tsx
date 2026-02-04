import React from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, getScoreColor, wp } from "@/constants/theme";
import { FacialStats } from "@/lib/storage";

interface StatsGridProps {
  stats: FacialStats;
}

function StatCard({ title, value }: { title: string; value: number }) {
  const { theme } = useTheme();
  const scoreColor = getScoreColor(value);

  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.statHeader}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {title}
        </ThemedText>
      </View>
      <View style={styles.statValueRow}>
        <ThemedText type="h2" style={{ color: scoreColor }}>
          {value}%
        </ThemedText>
      </View>
      <ProgressBar progress={value} height={wp('1.5%')} color={scoreColor} />
    </View>
  );
}

function OverallCard({ points }: { points: number }) {
  const { theme } = useTheme();
  const scoreColor = getScoreColor(points);

  return (
    <View style={[styles.overallCard, { backgroundColor: theme.backgroundDefault }]}>
      <View>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
          Overall Score
        </ThemedText>
        <ThemedText type="h1" style={{ color: scoreColor, fontSize: wp('11%'), lineHeight: wp('13%') }}>
          {points}
        </ThemedText>
      </View>
      <View style={styles.overallCircle}>
        {/* Simple visual indicator or icon could go here, for now just text layout */}
      </View>
    </View>
  );
}

export function StatsGrid({ stats }: StatsGridProps) {
  const statItems = [
    { title: "Symmetry", value: stats.symmetry },
    { title: "Jawline", value: stats.jawline },
    { title: "Proportions", value: stats.proportions },
    { title: "Skin Quality", value: stats.skinClarity },
    { title: "Masculinity", value: stats.masculinity },
    { title: "Cheekbones", value: stats.cheekbones },
  ];

  return (
    <View style={styles.container}>
      <ThemedText type="h4" style={styles.sectionTitle}>Current Stats</ThemedText>

      <OverallCard points={stats.overall} />

      <View style={styles.grid}>
        {statItems.map((item) => (
          <View key={item.title} style={styles.gridItem}>
            <StatCard title={item.title} value={item.value} />
          </View>
        ))}
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
  overallCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallCircle: {
    // Placeholder for potential circle chart
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statHeader: {
    marginBottom: Spacing.xs,
  },
  statValueRow: {
    marginBottom: Spacing.sm,
  },
});
