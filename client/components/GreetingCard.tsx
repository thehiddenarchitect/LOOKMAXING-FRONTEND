import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface GreetingCardProps {
  userName: string;
  improvementPercent?: number;
}

export function GreetingCard({
  userName,
  improvementPercent,
}: GreetingCardProps) {
  const { theme } = useTheme();

  const hasImprovement =
    improvementPercent !== undefined && improvementPercent > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText type="h3" style={styles.greeting}>
        Hey, <ThemedText type="h3" style={{ color: theme.primary }}>{userName}</ThemedText>
      </ThemedText>
      {hasImprovement ? (
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          Your score improved by{" "}
          <ThemedText type="body" style={{ color: theme.success, fontWeight: "600" }}>
            {improvementPercent.toFixed(1)}%
          </ThemedText>{" "}
          this week!
        </ThemedText>
      ) : (
        <ThemedText
          type="body"
          style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
        >
          Let's keep your streak alive today.{"\n"}Consistency is key.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  greeting: {
    marginBottom: Spacing.xs,
  },
});
