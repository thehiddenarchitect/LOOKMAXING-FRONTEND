import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, ScrollView, ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ExerciseCard } from "@/components/ExerciseCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, wp } from "@/constants/theme";
import { StorageService, DailyPlan } from "@/lib/storage";
import { StatsGrid } from "@/components/StatsGrid";
import { useData } from "@/context/DataContext";

type TabType = "daily" | "weekly";

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  // 1. Consume Global State
  const {
    scans,
    dailyRoutine,
    weeklyPlan,
  } = useData();

  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [isGenerating, setIsGenerating] = useState(false);

  // 2. Synchronous Derived State
  const totalScans = scans.length;

  const uniqueDays = useMemo(() => {
    return new Set(scans.map((s) => new Date(s.date).toDateString())).size;
  }, [scans]);

  // Lock Logic (Synchronous)
  const canUnlockDaily = totalScans >= 3;
  const canUnlockWeekly = uniqueDays >= 5 && totalScans >= 15;

  const [localDailyState, setLocalDailyState] = useState<Record<string, boolean>>({});

  const handleGenerateWeeklyPlan = async () => {
    if (!canUnlockWeekly) return;

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await StorageService.saveWeeklyPlan({} as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleDailyExercise = useCallback((id: string) => {
    setLocalDailyState(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleToggleWeeklyExercise = useCallback(async (id: string) => {
    // Similar local toggle logic would go here
  }, []);

  // Merge context data with local toggle state
  const displayDailyRoutine = useMemo(() => {
    return dailyRoutine.map(ex => ({
      ...ex,
      completed: localDailyState[ex.id] ?? ex.completed
    }));
  }, [dailyRoutine, localDailyState]);

  const completedDaily = displayDailyRoutine.filter((e) => e.completed).length;

  const renderExerciseItem: ListRenderItem<DailyPlan> = useCallback(({ item }) => (
    <ExerciseCard
      exercise={item}
      onToggle={handleToggleDailyExercise}
    />
  ), [handleToggleDailyExercise]);

  const renderDailyLockedState = () => (
    <View style={styles.lockedContainer}>
      <View style={[styles.lockedIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="lock" size={wp('8.5%')} color={theme.textSecondary} />
      </View>
      <ThemedText type="h4" style={styles.lockedTitle}>
        Daily Exercise Plan Locked
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.lockedSubtitle, { color: theme.textSecondary }]}
      >
        Complete at least 3 scans to unlock your personalized daily exercise plan
      </ThemedText>
      <View style={styles.progressInfo}>
        <Feather name="camera" size={wp('4%')} color={theme.primary} />
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}
        >
          {totalScans}/3 scans completed
        </ThemedText>
      </View>
    </View>
  );

  const renderWeeklyContent = () => (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingTop: Spacing.md,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <ThemedText type="h4" style={styles.sectionTitle}>
        Weekly Report
      </ThemedText>

      {/* 1. PLAN EXISTS: Show Report & Exercises */}
      {weeklyPlan ? (
        <>
          {weeklyPlan.report ? (
            <View style={{ marginBottom: Spacing.xl }}>
              {/* 5-Day Feature Averages */}
              <StatsGrid stats={weeklyPlan.report.stats} />

              {/* Consistency & Average Score Card */}
              <View style={{ flexDirection: 'row', marginTop: Spacing.md }}>
                <View style={[styles.statHalfCard, { backgroundColor: theme.backgroundDefault, marginRight: Spacing.xs }]}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Average Score</ThemedText>
                  <ThemedText type="h2" style={{ color: theme.primary }}>
                    {Math.round(weeklyPlan.report.averageScore)}
                  </ThemedText>
                </View>
                <View style={[styles.statHalfCard, { backgroundColor: theme.backgroundDefault, marginLeft: Spacing.xs }]}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Consistency</ThemedText>
                  <ThemedText type="h2" style={{ color: theme.success }}>
                    {Math.round(weeklyPlan.report.consistencyScore * 100)}%
                  </ThemedText>
                </View>
              </View>

              {/* Insights: Strongest / Weakest */}
              <View style={[styles.insightCard, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.md }]}>
                <View style={styles.insightRow}>
                  <Feather name="trending-up" size={wp('5%')} color={theme.success} />
                  <View style={{ marginLeft: Spacing.sm }}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Strongest</ThemedText>
                    <ThemedText type="h4" style={{ textTransform: 'capitalize' }}>
                      {weeklyPlan.report.strongestFeature.replace('_', ' ')}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.insightRow}>
                  <Feather name="trending-down" size={wp('5%')} color={theme.error} />
                  <View style={{ marginLeft: Spacing.sm }}>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>Weakest</ThemedText>
                    <ThemedText type="h4" style={{ textTransform: 'capitalize' }}>
                      {weeklyPlan.report.weakestFeature.replace('_', ' ')}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
              Plan Generated: {new Date(weeklyPlan.generatedAt).toLocaleDateString()}
            </ThemedText>
          )}

          <ThemedText type="h4" style={styles.sectionTitle}>
            Weekly Exercises
          </ThemedText>
          {weeklyPlan.focusAreas.length > 0 ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginBottom: Spacing.md }}
            >
              Focus: {weeklyPlan.focusAreas.join(", ")}
            </ThemedText>
          ) : null}
          {weeklyPlan.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onToggle={handleToggleWeeklyExercise}
            />
          ))}
        </>
      ) : (
        /* 2. NO PLAN: Check Locked vs Unlocked status */
        <View style={[styles.weeklyStatusCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            Check Weekly Status
          </ThemedText>

          <View
            style={[
              styles.weeklyLockIcon,
              canUnlockWeekly ? { backgroundColor: theme.primary } : { backgroundColor: "#333" },
            ]}
          >
            <Feather
              name={canUnlockWeekly ? "unlock" : "lock"}
              size={wp('10.5%')}
              color={canUnlockWeekly ? "#FFFFFF" : theme.textSecondary}
            />
          </View>

          <ThemedText type="h4" style={{ marginTop: Spacing.md }}>
            {canUnlockWeekly ? "Ready to Unlock" : "Report Locked"}
          </ThemedText>

          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs, textAlign: "center", paddingHorizontal: Spacing.lg }}
          >
            {canUnlockWeekly
              ? "You have met the requirements! Generate your personalized plan."
              : "Weekly report is locked. Complete 5 active days & 15 scans."}
          </ThemedText>

          {/* Progress Indicators */}
          {!canUnlockWeekly && (
            <View style={styles.weeklyProgress}>
              <View style={styles.weeklyProgressItem}>
                <ThemedText type="h3" style={{ color: uniqueDays >= 5 ? theme.primary : theme.textSecondary }}>
                  {uniqueDays}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>/5 days</ThemedText>
              </View>
              <View style={[styles.weeklyDivider, { backgroundColor: theme.border }]} />
              <View style={styles.weeklyProgressItem}>
                <ThemedText type="h3" style={{ color: totalScans >= 15 ? theme.primary : theme.textSecondary }}>
                  {totalScans}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>/15 scans</ThemedText>
              </View>
            </View>
          )}

          {/* Unlock Button */}
          {canUnlockWeekly && (
            <Button
              style={{ marginTop: Spacing.xl, width: "100%" }}
              onPress={handleGenerateWeeklyPlan}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Unlock Weekly Report"}
            </Button>
          )}
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View style={[styles.tabContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            onPress={() => setActiveTab("daily")}
            style={[
              styles.tab,
              activeTab === "daily" && {
                backgroundColor: theme.primary,
              },
            ]}
          >
            <Feather
              name="sun"
              size={wp('4%')}
              color={activeTab === "daily" ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              type="body"
              style={{
                color: activeTab === "daily" ? "#FFFFFF" : theme.textSecondary,
                marginLeft: Spacing.xs,
              }}
            >
              Daily
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("weekly")}
            style={[
              styles.tab,
              activeTab === "weekly" && {
                backgroundColor: theme.primary,
              },
            ]}
          >
            <Feather
              name="calendar"
              size={wp('4%')}
              color={activeTab === "weekly" ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              type="body"
              style={{
                color: activeTab === "weekly" ? "#FFFFFF" : theme.textSecondary,
                marginLeft: Spacing.xs,
              }}
            >
              Weekly
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {activeTab === "daily" ? (
        canUnlockDaily ? (
          <FlatList
            data={displayDailyRoutine}
            keyExtractor={(item) => item.id}
            renderItem={renderExerciseItem}
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingBottom: tabBarHeight + Spacing.xl,
              paddingTop: Spacing.md,
            }}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <ThemedText type="h4">Daily Exercise Plan</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {completedDaily}/{displayDailyRoutine.length} completed
                </ThemedText>
              </View>
            }
            scrollIndicatorInsets={{ bottom: insets.bottom }}
            initialNumToRender={5}
            removeClippedSubviews={true}
          />
        ) : (
          <View style={styles.lockedWrapper}>{renderDailyLockedState()}</View>
        )
      ) : (
        renderWeeklyContent()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  lockedWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  lockedContainer: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  lockedIconContainer: {
    width: wp('21%'),
    height: wp('21%'),
    borderRadius: wp('10.5%'),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  lockedTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  lockedSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  weeklyStatusCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  weeklyLockIcon: {
    width: wp('21%'),
    height: wp('21%'),
    borderRadius: wp('10.5%'),
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyProgress: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  weeklyProgressItem: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: Spacing.lg,
  },
  weeklyDivider: {
    width: 1,
    height: wp('6.5%'),
  },
  statHalfCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
});
