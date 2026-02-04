import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, getScoreColor, wp } from "@/constants/theme";
import { FacialStats } from "@/lib/storage";

interface ScanResultCardProps {
  stats: FacialStats;
  imageUri?: string;
}

function StatRow({ label, value }: { label: string; value: number }) {
  const { theme } = useTheme();
  const color = getScoreColor(value);

  return (
    <View style={styles.statRow}>
      <View style={styles.statHeader}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {label}
        </ThemedText>
        <ThemedText type="h4" style={{ color, fontWeight: '600' }}>
          {value}
        </ThemedText>
      </View>
      <View style={styles.progressWrapper}>
        <ProgressBar progress={value} height={wp('1.5%')} color={color} />
      </View>
    </View>
  );
}

export function ScanResultCard({ stats, imageUri }: ScanResultCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
          Overall Score
        </ThemedText>
        <ThemedText
          type="h1"
          style={[styles.mainScore, { color: getScoreColor(stats.overall) }]}
        >
          {stats.overall}
        </ThemedText>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsColumn}>
          <StatRow label="Symmetry" value={stats.symmetry} />
          <StatRow label="Jawline" value={stats.jawline} />
          <StatRow label="Proportions" value={stats.proportions} />
        </View>
        <View style={styles.statsColumn}>
          <StatRow label="Skin Clarity" value={stats.skinClarity} />
          <StatRow label="Masculinity" value={stats.masculinity} />
          <StatRow label="Cheekbones" value={stats.cheekbones || 0} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  mainScore: {
    fontSize: wp('16%'),
    fontWeight: "700",
    lineHeight: wp('18%'),
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  statsColumn: {
    flex: 1,
    gap: Spacing.md,
  },
  statRow: {
    marginBottom: Spacing.xs,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  progressWrapper: {
    width: "100%",
  },
});
