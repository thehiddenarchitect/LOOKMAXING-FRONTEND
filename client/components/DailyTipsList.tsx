import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { DAILY_TIPS } from "@/lib/storage";

interface DailyTipsListProps {
  completedTips: string[];
  onToggleTip: (tipId: string) => void;
}

export function DailyTipsList({
  completedTips,
  onToggleTip,
}: DailyTipsListProps) {
  const { theme } = useTheme();

  const handleToggle = (tipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleTip(tipId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {DAILY_TIPS.map((tip) => {
          const isCompleted = completedTips.includes(tip.id);
          return (
            <Pressable
              key={tip.id}
              onPress={() => handleToggle(tip.id)}
              style={({ pressed }) => [
                styles.tipCard,
                {
                  backgroundColor: isCompleted
                    ? theme.success
                    : theme.backgroundDefault,
                  borderColor: isCompleted ? theme.success : theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isCompleted
                      ? "rgba(255,255,255,0.2)"
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                {isCompleted ? (
                  <Feather name="check" size={wp('5%')} color="#FFFFFF" />
                ) : (
                  <Feather
                    name={tip.icon as any}
                    size={wp('5%')}
                    color={theme.textSecondary}
                  />
                )}
              </View>
              <ThemedText
                type="body"
                style={[
                  styles.tipText,
                  { color: isCompleted ? "#FFFFFF" : theme.text },
                ]}
              >
                {tip.title}
              </ThemedText>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  tipCard: {
    width: "48%",
    marginHorizontal: "1%",
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  iconContainer: {
    width: wp('10.5%'),
    height: wp('10.5%'),
    borderRadius: wp('5.25%'),
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontWeight: "500",
  },
});
