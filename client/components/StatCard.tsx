import React from "react";
import { View, StyleSheet } from "react-native";

import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface StatCardProps {
  title: string;
  value: number;
  compact?: boolean;
}

export function StatCard({ title, value, compact = false }: StatCardProps) {
  const { theme } = useTheme();

  return (
    <Card elevation={1} style={compact ? styles.compactCard : styles.card}>
      <View style={styles.header}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {title}
        </ThemedText>
        <ThemedText type="h4" style={{ color: theme.primary }}>
          {value}%
        </ThemedText>
      </View>
      <ProgressBar progress={value} height={6} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  compactCard: {
    padding: Spacing.md,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
});
