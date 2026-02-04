import React, { useState } from "react";
import { ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { GreetingCard } from "@/components/GreetingCard";
import { StatsGrid } from "@/components/StatsGrid";
import { DailyTipsList } from "@/components/DailyTipsList";
import { DailyReportCard } from "@/components/DailyReportCard";
import { ThemedText } from "@/components/ThemedText";
import { useData } from "@/context/DataContext";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const {
    profile,
    latestStats,
    completedTips,
    todayScans,
    toggleTip,
    refreshData,
    scans
  } = useData();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const isDailyReportLocked = todayScans.length < 3;

  // Calculate improvement percent (simplified logic for now)
  // In a real app we'd want this computed in DataProvider but this is fast enough
  const improvementPercent = 0; // Placeholder

  const averageStats = React.useMemo(() => {
    if (todayScans.length === 0) return undefined;

    const count = todayScans.length;
    const total = todayScans.reduce((acc, scan) => ({
      symmetry: acc.symmetry + scan.stats.symmetry,
      jawline: acc.jawline + scan.stats.jawline,
      proportions: acc.proportions + scan.stats.proportions,
      masculinity: acc.masculinity + scan.stats.masculinity,
      skinClarity: acc.skinClarity + scan.stats.skinClarity,
      cheekbones: acc.cheekbones + (scan.stats.cheekbones || 0),
      overall: acc.overall + scan.stats.overall,
    }), { symmetry: 0, jawline: 0, proportions: 0, masculinity: 0, skinClarity: 0, cheekbones: 0, overall: 0 });

    return {
      symmetry: total.symmetry / count,
      jawline: total.jawline / count,
      proportions: total.proportions / count,
      masculinity: total.masculinity / count,
      skinClarity: total.skinClarity / count,
      cheekbones: total.cheekbones / count,
      overall: total.overall / count,
    };
  }, [todayScans]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <GreetingCard
        userName={profile?.name || "User"}
        improvementPercent={improvementPercent > 0 ? improvementPercent : undefined}
      />

      <StatsGrid stats={latestStats} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Daily Protocol
      </ThemedText>

      <DailyTipsList
        completedTips={completedTips}
        onToggleTip={toggleTip}
      />

      <DailyReportCard
        isLocked={isDailyReportLocked}
        scansToday={todayScans.length}
        averageStats={averageStats}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: Spacing.md,
  },
});
