import { Platform } from "react-native";
import { supabase } from './supabase';

// Use localhost for iOS simulator, 10.0.2.2 for Android emulator, or localhost for web/desktop
// Adjust this if running on a physical device (use your LAN IP)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

export interface ScanResponse {
  id: string;
  created_at: string;
  metrics: {
    symmetry: number;
    jawline: number;
    skin_clarity: number;
    masculinity: number;
    proportions: number;
    cheekbones: number;
  };
  overall_score: number;
}

export interface DailyReport {
  date: string;
  scans_count: number;
  average_score: number;
  metrics: Record<string, number>;
  daily_tips: string[];
}

export interface WeeklyReport {
  is_locked: boolean;
  message?: string;
  progress?: string;
  stats?: {
    average_score: number;
    consistency_score: number;
    metric_averages: Record<string, number>;
    top_metric: string;
    weakest_metric: string;
  };
}

export interface Exercise {
  id: string;
  name: string;
  type: string;
  feature?: string;
  instructions: string;
  duration: string;
}

export interface DailyPlanResponse {
  is_locked?: boolean;
  title?: string;
  description?: string;
  routine?: Exercise[];
}


export interface ScanStatusResponse {
  scansUsedToday: number;
  scanLimit: number;
  canScan: boolean;
  serverTimeUtc: string;
  nextResetUtc: string;
}

// Helper to handle authenticated requests
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  // Debug log to ensure token is being retrieved
  if (!token) {
    console.warn("fetchWithAuth: No access token found in session!");
  }

  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  } as HeadersInit;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.detail) errorMessage = errorJson.detail;
    } catch { }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const api = {
  /**
   * Proxied Sign Up via Backend
   */
  /**
   * Proxied Sign Up via Backend
   */
  signUp: async ({
    email,
    password,
    age,
    gender,
    name,
    height,
    weight
  }: {
    email: string;
    password: string;
    age: number;
    gender: string;
    name: string;
    height: number;
    weight: number;
  }): Promise<any> => {
    // DEBUG: Log payload to console
    console.log("SIGNUP PAYLOAD:", { email, age, gender, name, height, weight });

    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        age,
        gender,
        name,
        height,
        weight
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn("Signup Error:", data);
      throw new Error(data.detail || "Signup failed");
    }

    // Success = { success: true, message: "..." }
    // No session returned.
    return data;
  },



  /**
   * Fetches the current daily scan limits and server time.
   */
  getScanStatus: async (): Promise<ScanStatusResponse> => {
    return fetchWithAuth('/scans/status');
  },

  /**
   * Uploads an image for scanning.
   */
  uploadScan: async (imageUri: string): Promise<ScanResponse> => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'scan.jpg';

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
    } else {
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      // @ts-ignore: React Native FormData signature is compatible
      formData.append('file', { uri: imageUri, name: filename, type });
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/scans/image`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Scan failed";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail) errorMessage = errorJson.detail;
      } catch { }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  /**
   * Fetches the latest scan using history (fallback as /latest might not exist).
   */
  getLatestScan: async (): Promise<ScanResponse> => {
    // We use history with limit 1
    const { scans } = await fetchWithAuth('/scans/history?limit=1');
    if (scans && scans.length > 0) {
      return scans[0];
    }
    throw new Error("No scans found");
  },

  /**
   * Fetches scan history.
   */
  getHistory: async (limit: number = 20): Promise<{ scans: ScanResponse[] }> => {
    return fetchWithAuth(`/scans/history?limit=${limit}`);
  },

  /**
   * Syncs Google Profile with Backend
   */
  syncProfile: async (data: { name?: string, avatar_url?: string }): Promise<any> => {
    return fetchWithAuth('/auth/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  /**
   * Fetches the daily report.
   */
  getDailyReport: async (): Promise<DailyReport> => {
    return fetchWithAuth('/analysis/daily');
  },

  /**
   * Fetches the daily plan (Morning Active Routine).
   */
  getDailyPlan: async (): Promise<DailyPlanResponse> => {
    return fetchWithAuth('/plans/today');
  },

  /**
   * Fetches the weekly report.
   */
  getWeeklyReport: async (): Promise<WeeklyReport> => {
    return fetchWithAuth('/analysis/weekly');
  },

  /**
   * Fetches the current weekly plan (Evening Routine).
   */
  getWeeklyPlan: async (): Promise<any> => {
    return fetchWithAuth('/plans/weekly/current');
  },

  /**
   * Generates a new weekly plan.
   */
  generateWeeklyPlan: async (): Promise<any> => {
    return fetchWithAuth('/plans/weekly/generate', {
      method: 'POST'
    });
  },

  /**
   * Creates or updates the user profile.
   */
  saveProfile: async (profile: any): Promise<any> => {
    return fetchWithAuth('/profile/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        avatar_uri: profile.avatarUri
      }),
    });
  },

  /**
   * Resets all backend data (Dev only).
   */
  resetData: async (): Promise<void> => {
    try {
      await Promise.all([
        fetchWithAuth('/scans/reset', { method: 'DELETE' }),
        fetchWithAuth('/profile/reset', { method: 'DELETE' })
      ]);
    } catch (e) {
      console.warn("Failed to reset backend data", e);
    }
  },

  /**
   * Resets only scan history (leaves profile and limits intact).
   */
  resetScanHistory: async (): Promise<void> => {
    try {
      await fetchWithAuth('/scans/reset', { method: 'DELETE' });
    } catch (e) {
      console.warn("Failed to reset scan history", e);
    }
  }
};
