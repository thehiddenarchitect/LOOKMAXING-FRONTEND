import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CHALLENGES } from "@/lib/storage";

interface ChallengesListProps {
  completedChallenges: string[];
  onToggleChallenge: (challengeId: string) => void;
}

export function ChallengesList({
  completedChallenges,
  onToggleChallenge,
}: ChallengesListProps) {
  const { theme } = useTheme();

  const handleToggle = (challengeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleChallenge(challengeId);
  };

  const completedCount = completedChallenges.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="h4">Weekly Challenges</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {completedCount}/{CHALLENGES.length} completed
        </ThemedText>
      </View>
      <View style={styles.challengesRow}>
        {CHALLENGES.map((challenge) => {
          const isCompleted = completedChallenges.includes(challenge.id);
          return (
            <Pressable
              key={challenge.id}
              onPress={() => handleToggle(challenge.id)}
              style={({ pressed }) => [
                styles.challengeItem,
                {
                  backgroundColor: isCompleted
                    ? theme.success
                    : theme.backgroundDefault,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather
                name={challenge.icon as any}
                size={24}
                color={isCompleted ? "#FFFFFF" : theme.primary}
              />
              <ThemedText
                type="small"
                style={[
                  styles.challengeText,
                  { color: isCompleted ? "#FFFFFF" : theme.text },
                ]}
                numberOfLines={2}
              >
                {challenge.title}
              </ThemedText>
              {isCompleted ? (
                <View style={styles.checkBadge}>
                  <Feather name="check" size={12} color={theme.success} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  challengesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  challengeItem: {
    width: "31%",
    marginHorizontal: "1%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    position: "relative",
  },
  challengeText: {
    textAlign: "center",
    marginTop: Spacing.sm,
    fontSize: 11,
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
