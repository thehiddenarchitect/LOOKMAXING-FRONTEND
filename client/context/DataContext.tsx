import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { StorageService, UserProfile, FacialStats, ScanRecord, getPlaceholderStats, WeeklyPlan, DailyPlan, getMorningRoutine } from "@/lib/storage";

import { useAuth } from "./AuthContext";

interface DataContextType {
    // State (Single Source of Truth)
    profile: UserProfile | null;
    scans: ScanRecord[];
    latestStats: FacialStats;
    todayScans: ScanRecord[];
    dailyScanCount: number;
    lifetimeStats: { totalScans: number, daysActive: number, lastScanDate: string }; // New
    weeklyPlan: WeeklyPlan | null;
    dailyRoutine: DailyPlan[];
    completedTips: string[];

    // Actions
    refreshData: () => Promise<void>;
    addScan: (scan: ScanRecord) => void;
    updateProfile: (profile: UserProfile) => void;
    toggleTip: (tipId: string) => void;

    // Loading state
    isInitialized: boolean;
}

const DataContext = createContext<DataContextType>({
    profile: null,
    scans: [],
    latestStats: getPlaceholderStats(),
    todayScans: [],
    dailyScanCount: 0,
    lifetimeStats: { totalScans: 0, daysActive: 0, lastScanDate: "Never" },
    weeklyPlan: null,
    dailyRoutine: [],
    completedTips: [],
    refreshData: async () => { },
    addScan: () => { },
    updateProfile: () => { },
    toggleTip: () => { },
    isInitialized: false,
});



export function useData() {
    return useContext(DataContext);
}

export function DataProvider({ children }: { children: ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);

    // Global State - In-Memory Cache
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [scans, setScans] = useState<ScanRecord[]>([]);
    const [dailyScanCount, setDailyScanCount] = useState(0);
    const [lifetimeStats, setLifetimeStats] = useState({ totalScans: 0, daysActive: 0, lastScanDate: "Never" });
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
    const [dailyRoutine, setDailyRoutine] = useState<DailyPlan[]>([]);
    const [completedTips, setCompletedTips] = useState<string[]>([]);

    // --- Derived State (Synchronous) ---
    const latestStats = useMemo(() => {
        if (scans.length > 0) {
            return scans[0].stats;
        }
        return getPlaceholderStats();
    }, [scans]);

    const todayScans = useMemo(() => {
        const today = new Date().toDateString();
        const daily = scans.filter((s) => new Date(s.date).toDateString() === today);
        return Array.from(new Map(daily.map(s => [s.id, s])).values());
    }, [scans]);

    // Ensure dailyScanCount is at least the visible count (syncing fallback)
    useEffect(() => {
        if (todayScans.length > dailyScanCount) {
            setDailyScanCount(todayScans.length);
        }
    }, [todayScans.length]);

    // --- Loaders (Run once on mount) ---

    const loadProfile = async () => {
        const data = await StorageService.getProfile();
        if (data) setProfile(data);
    };

    const loadScans = async () => {
        const data = await StorageService.getScans();
        setScans(data);
        // Also fetch persistent count
        const count = await StorageService.getDailyUsageCount();
        setDailyScanCount(prev => Math.max(prev, count));

        // Fetch persistent lifetime stats
        const stats = await StorageService.getLifetimeStats();
        // Fallback migration: If stats are empty but we have scans
        if (stats.totalScans === 0 && data.length > 0 && stats.lastScanDate === "Never") {
            const uniqueDays = new Set(data.map(s => new Date(s.date).toDateString())).size;
            const lastScanDate = data.length > 0 ? new Date(data[0].date).toLocaleDateString() : "Never";
            setLifetimeStats({
                totalScans: data.length,
                daysActive: uniqueDays,
                lastScanDate: lastScanDate
            });
        } else {
            setLifetimeStats(stats);
        }
    };

    const loadRoutine = async () => {
        // Load routine and plan
        const [routine, weekly] = await Promise.all([
            getMorningRoutine(),
            StorageService.getWeeklyPlan()
        ]);
        setDailyRoutine(routine);
        setWeeklyPlan(weekly);
    };

    const loadTips = async () => {
        const tips = await StorageService.getCompletedTipsToday();
        setCompletedTips(tips);
    };

    const { session } = useAuth();

    // Initial Data Load & Session Sync
    useEffect(() => {
        const initData = async () => {
            // If no session, clear state or ensure empty?
            // Actually loadProfile handles 'null' return nicely.
            // But we want to ensure we re-fetch when session changes.
            try {
                // Parallel fetch for speed
                await Promise.all([
                    loadProfile(),
                    loadScans(),
                    loadRoutine(),
                    loadTips(),
                ]);
            } catch (e) {
                console.warn("Failed to initialize data:", e);
            } finally {
                setIsInitialized(true);
            }
        };
        initData();
    }, [session?.user?.id]); // Re-run when user changes

    // Reactive Refresh: If 3 scans completed (using visible or persistent), fetch routine again (Unlock)
    useEffect(() => {
        const effectiveCount = Math.max(todayScans.length, dailyScanCount);
        if (effectiveCount >= 3 && dailyRoutine.length === 0) {
            // Unlocked! Fetch plan immediately
            loadRoutine();
        }
    }, [todayScans.length, dailyScanCount, dailyRoutine.length]);

    // --- Actions ---

    const refreshData = useCallback(async () => {
        // Silent refresh - update state in background
        await Promise.all([
            loadProfile(),
            loadScans(),
            loadRoutine(),
            loadTips(),
        ]);
    }, []);

    const addScan = useCallback(async (newScan: ScanRecord) => {
        // Optimistic Update: Instant UI reflection
        setScans((prev) => {
            if (prev.some(s => s.id === newScan.id)) return prev;
            return [newScan, ...prev];
        });

        // Update persistent usage count locally
        const newCount = await StorageService.incrementDailyUsage();
        setDailyScanCount(newCount);

        // Update persistent lifetime stats
        try {
            await StorageService.updateLifetimeStats(newScan.date);
            const newStats = await StorageService.getLifetimeStats();
            setLifetimeStats(newStats);
        } catch (e) {
            console.error("Failed to update lifetime stats", e);
        }
    }, []);

    const updateProfile = useCallback((newProfile: UserProfile) => {
        // Optimistic Update
        setProfile(newProfile);
        // Background Persist
        StorageService.saveProfile(newProfile).catch(console.error);
    }, []);

    const toggleTip = useCallback((tipId: string) => {
        // Optimistic Update
        setCompletedTips(prev => {
            const exists = prev.includes(tipId);
            const next = exists ? prev.filter(id => id !== tipId) : [...prev, tipId];
            return next;
        });

        // Background Persist
        StorageService.toggleTipCompleted(tipId).catch(console.error);
    }, []);

    return (
        <DataContext.Provider value={{
            profile,
            scans,
            latestStats,
            todayScans,
            dailyScanCount, // Exposed
            lifetimeStats, // Exposed
            weeklyPlan,
            dailyRoutine,
            completedTips,
            refreshData,
            addScan,
            updateProfile,
            toggleTip,
            isInitialized
        }}>
            {children}
        </DataContext.Provider>
    );
}
