import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { DailyPlan } from "@/lib/storage";

interface ExerciseCardProps {
  exercise: DailyPlan;
  onToggle: (id: string) => void;
}

export function ExerciseCard({ exercise, onToggle }: ExerciseCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(exercise.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: exercise.completed ? theme.success : "transparent",
            borderColor: exercise.completed ? theme.success : theme.border,
          },
        ]}
      >
        {exercise.completed ? (
          <Feather name="check" size={wp('4%')} color="#FFFFFF" />
        ) : null}
      </View>
      <View style={styles.content}>
        <ThemedText
          type="body"
          style={[
            styles.title,
            {
              textDecorationLine: exercise.completed ? "line-through" : "none",
              color: exercise.completed ? theme.textSecondary : theme.text,
            },
          ]}
        >
          {exercise.title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {exercise.description}
        </ThemedText>
      </View>
      <View style={styles.duration}>
        <Feather name="clock" size={wp('3.5%')} color={theme.textSecondary} />
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}
        >
          {exercise.duration}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: wp('6.5%'),
    height: wp('6.5%'),
    borderRadius: wp('2.1%'),
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    paddingRight: Spacing.sm, // Add padding to avoid touching duration
  },
  title: {
    marginBottom: Spacing.xs,
    flexWrap: 'wrap', // Ensure wrapping
  },
  duration: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: Spacing.sm,
    // Ensure duration doesn't crush the text, but doesn't shrink either
    flexShrink: 0,
  },
});
