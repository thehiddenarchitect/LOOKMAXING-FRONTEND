import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import { supabase } from "./supabase";

const KEYS = {
  PROFILE: "lookmax_profile",
  DAILY_TIPS_COMPLETED: "lookmax_daily_tips",
  CHALLENGES_COMPLETED: "lookmax_challenges",
};

export interface UserProfile {
  name: string;
  age: number;
  gender?: "male" | "female" | "prefer_not_to_say";
  height?: number; // cm
  weight?: number; // kg
  avatarUri?: string;
}

export interface FacialStats {
  symmetry: number;
  jawline: number;
  proportions: number;
  skinClarity: number;
  masculinity: number;
  cheekbones: number;
  overall: number;
}

export interface ScanRecord {
  id: string;
  date: string;
  imageUri?: string;
  stats: FacialStats;
  lifestyle: {
    sleep: number;
    water: number;
    diet: string;
    exercise: string;
  };
}

export interface DailyPlan {
  id: string;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
}

export interface WeeklyPlan {
  generatedAt: string;
  exercises: DailyPlan[];
  focusAreas: string[];
  report?: {
    averageScore: number;
    consistencyScore: number;
    stats: FacialStats;
    strongestFeature: string;
    weakestFeature: string;
  };
}

export const StorageService = {
  async getProfile(): Promise<UserProfile | null> {
    try {
      // 1. Try Local Storage
      const data = await AsyncStorage.getItem(KEYS.PROFILE);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.name) {
          return parsed;
        }
      }

      // 2. Fallback: Fetch from Supabase directly
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile && !error) {
          const userProfile: UserProfile = {
            name: profile.name || "User",
            age: profile.age || 0,
            gender: profile.gender || "male",
            height: profile.height_cm,
            weight: profile.weight_kg,
            avatarUri: undefined // Avatar URL if stored in DB
          };
          // Save for next time
          await this.saveProfile(userProfile);
          return userProfile;
        }
      }
      return null;
    } catch (e) {
      console.warn("Error getting profile:", e);
      return null;
    }
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    try {
      await api.saveProfile(profile);
    } catch (e) {
      console.warn("Failed to sync profile to backend", e);
    }
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.PROFILE,
      KEYS.DAILY_TIPS_COMPLETED,
      KEYS.CHALLENGES_COMPLETED,
      "lookmax_daily_usage",
      "lookmax_lifetime_stats"
    ]);
    await api.resetData();
  },

  async clearHistoryOnly(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.DAILY_TIPS_COMPLETED,
      KEYS.CHALLENGES_COMPLETED
    ]);
    await api.resetScanHistory();
  },

  async getScans(): Promise<ScanRecord[]> {
    try {
      const { scans } = await api.getHistory(50);
      return scans.map((s) => ({
        id: s.id,
        date: s.created_at,
        // We don't get the image back from API in this simple version
        stats: {
          symmetry: s.metrics.symmetry,
          jawline: s.metrics.jawline,
          proportions: s.metrics.proportions,
          skinClarity: s.metrics.skin_clarity,
          masculinity: s.metrics.masculinity,
          cheekbones: s.metrics.cheekbones || 0,
          overall: s.overall_score,
        },
        lifestyle: { sleep: 0, water: 0, diet: "", exercise: "" },
      }));
    } catch (e) {
      console.error("Failed to get scans", e);
      return [];
    }
  },

  async addScan(scan: ScanRecord): Promise<void> {
    // This is now handled by uploadScan mainly, but for compatibility
    if (scan.imageUri) {
      await api.uploadScan(scan.imageUri);
    }
  },

  async getScansToday(): Promise<ScanRecord[]> {
    const scans = await this.getScans();
    const today = new Date().toDateString();
    return scans.filter((s) => new Date(s.date).toDateString() === today);
  },

  async getDailyReport(): Promise<{ stats: FacialStats | null, count: number }> {
    try {
      const report = await api.getDailyReport();
      if (report.scans_count < 3) {
        return { stats: null, count: report.scans_count };
      }
      return {
        count: report.scans_count,
        stats: {
          symmetry: report.metrics.symmetry,
          jawline: report.metrics.jawline,
          proportions: report.metrics.proportions,
          skinClarity: report.metrics.skin_clarity,
          masculinity: report.metrics.masculinity,
          cheekbones: report.metrics.cheekbones,
          overall: report.average_score
        }
      };
    } catch (e) {
      console.error(e);
      return { stats: null, count: 0 };
    }
  },

  async getScansThisWeek(): Promise<ScanRecord[]> {
    const scans = await this.getScans();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return scans.filter((s) => new Date(s.date) >= weekAgo);
  },

  async getLatestScan(): Promise<ScanRecord | null> {
    const scans = await this.getScans();
    return scans.length > 0 ? scans[0] : null;
  },

  async getCompletedTipsToday(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.DAILY_TIPS_COMPLETED);
      if (!data) return [];
      const parsed = JSON.parse(data);
      const today = new Date().toDateString();
      if (parsed.date !== today) return [];
      return parsed.completed || [];
    } catch {
      return [];
    }
  },

  async toggleTipCompleted(tipId: string): Promise<string[]> {
    const completed = await this.getCompletedTipsToday();
    const today = new Date().toDateString();
    let newCompleted: string[];
    if (completed.includes(tipId)) {
      newCompleted = completed.filter((id) => id !== tipId);
    } else {
      newCompleted = [...completed, tipId];
    }
    await AsyncStorage.setItem(
      KEYS.DAILY_TIPS_COMPLETED,
      JSON.stringify({ date: today, completed: newCompleted })
    );
    return newCompleted;
  },

  async getWeeklyPlan(): Promise<WeeklyPlan | null> {
    try {
      // Fetch plan AND report
      const [planData, reportData] = await Promise.all([
        api.getWeeklyPlan(),
        api.getWeeklyReport()
      ]);

      if (planData.is_locked) return null;

      // Map API response to WeeklyPlan
      return {
        generatedAt: new Date().toISOString(),
        focusAreas: [],
        exercises: planData.weekly_routine.map((ex: any, idx: number) => ({
          id: `weekly_${idx}`,
          title: ex.name,
          description: ex.instructions || "Follow instructions",
          duration: ex.duration,
          completed: false,
        })),
        report: !reportData.is_locked && reportData.stats ? {
          averageScore: reportData.stats.average_score,
          consistencyScore: reportData.stats.consistency_score,
          strongestFeature: reportData.stats.top_metric,
          weakestFeature: reportData.stats.weakest_metric,
          stats: {
            symmetry: reportData.stats.metric_averages.symmetry || 0,
            jawline: reportData.stats.metric_averages.jawline || 0,
            proportions: reportData.stats.metric_averages.proportions || 0,
            skinClarity: reportData.stats.metric_averages.skin_clarity || 0,
            masculinity: reportData.stats.metric_averages.masculinity || 0,
            cheekbones: reportData.stats.metric_averages.cheekbones || 0,
            overall: reportData.stats.average_score
          }
        } : undefined
      };
    } catch {
      return null;
    }
  },

  async saveWeeklyPlan(plan: WeeklyPlan): Promise<void> {
    // API generates it, we don't save manually except maybe completion status locally
    // For now, this might just trigger generation on API side if used that way
    await api.generateWeeklyPlan();
  },

  async getDailyUsageCount(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem("lookmax_daily_usage");
      if (!data) return 0;
      const { date, count } = JSON.parse(data);
      if (date === new Date().toDateString()) {
        return count;
      }
      return 0; // New day
    } catch {
      return 0;
    }
  },

  async incrementDailyUsage(): Promise<number> {
    const current = await this.getDailyUsageCount();
    const newCount = current + 1;
    await AsyncStorage.setItem("lookmax_daily_usage", JSON.stringify({
      date: new Date().toDateString(),
      count: newCount,
      lastScanTime: Date.now() // Also track time
    }));
    return newCount;
  },

  async getLastScanTimestamp(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem("lookmax_daily_usage");
      if (!data) return null;
      const { lastScanTime } = JSON.parse(data);
      return lastScanTime || null;
    } catch {
      return null;
    }
  },

  async getLifetimeStats(): Promise<{ totalScans: number, daysActive: number, lastScanDate: string }> {
    try {
      const data = await AsyncStorage.getItem("lookmax_lifetime_stats");
      if (!data) return { totalScans: 0, daysActive: 0, lastScanDate: "Never" };
      return JSON.parse(data);
    } catch {
      return { totalScans: 0, daysActive: 0, lastScanDate: "Never" };
    }
  },

  async updateLifetimeStats(scanDate: string): Promise<void> {
    const current = await this.getLifetimeStats();

    // Check if new day for 'daysActive'
    // This is simple approximation: check if lastScanDate !== today
    const today = new Date().toLocaleDateString();
    const isNewDay = current.lastScanDate !== today && current.lastScanDate !== "Never";
    // If it's "Never" it is the first day, so it counts as 1 day active.

    // Actually, 'daysActive' logic: set of unique days.
    // We can't store set easily in JSON without full history which we want to avoid for lightweight persistence.
    // Approximation: Store Set of date strings if we want accuracy OR just increment if lastScanDate != today.
    // Let's stick to simple increment if date changed. (User wants persistent count).

    let daysActive = current.daysActive;
    if (current.lastScanDate !== today) {
      daysActive += 1;
    }

    const updated = {
      totalScans: current.totalScans + 1,
      daysActive: daysActive,
      lastScanDate: today
    };

    await AsyncStorage.setItem("lookmax_lifetime_stats", JSON.stringify(updated));
  },
};

export function generateMockStats(): FacialStats {
  // Keeping for fallback/testing
  return {
    symmetry: 80,
    jawline: 80,
    proportions: 80,
    skinClarity: 80,
    masculinity: 80,
    cheekbones: 80,
    overall: 80,
  };
}

export function getPlaceholderStats(): FacialStats {
  return {
    symmetry: 0,
    jawline: 0,
    proportions: 0,
    skinClarity: 0,
    masculinity: 0,
    cheekbones: 0,
    overall: 0,
  };
}

export const DAILY_TIPS = [
  { id: "water", title: "Drink 3L\nWater", icon: "droplet" },
  { id: "sleep", title: "8h Sleep", icon: "moon" },
  { id: "moisturize", title: "Moisturize", icon: "star" },
  { id: "nosugar", title: "No Sugar", icon: "slash" },
  { id: "coldshower", title: "Cold\nShower", icon: "sun" },
  { id: "workout", title: "Workout", icon: "activity" },
];

// Helper to get daily routine from API
// NOTE: Now async!
export async function getMorningRoutine(): Promise<DailyPlan[]> {
  try {
    const plan = await api.getDailyPlan();
    if (plan.is_locked || !plan.routine) return [];

    return plan.routine.map((ex: any, idx: number) => ({
      id: `daily_${idx}`,
      title: typeof ex === 'string' ? ex : ex.name,
      description: typeof ex === 'string' ? "Morning routine" : ex.instructions,
      duration: typeof ex === 'string' ? "2 min" : ex.duration,
      completed: false
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

