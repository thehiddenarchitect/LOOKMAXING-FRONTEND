import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { Alert } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

const isMock = supabaseUrl.includes("placeholder");

// --- MOCK IMPLEMENTATION FOR DEMO/TESTING WITHOUT KEYS ---
class MockSupabaseClient {
    auth = {
        getSession: async () => {
            const stored = await AsyncStorage.getItem('mock_supabase_session');
            return { data: { session: stored ? JSON.parse(stored) : null }, error: null };
        },
        signInWithPassword: async ({ email, password }: any) => {
            // Simulate network delay
            await new Promise(r => setTimeout(r, 1000));
            if (password === "error") return { data: { user: null, session: null }, error: { message: "Invalid credentials" } };

            const user = { id: "mock-user-id", email };
            const session = { access_token: "mock-token", user };
            await AsyncStorage.setItem('mock_supabase_session', JSON.stringify(session));
            this._notifyChange('SIGNED_IN', session);
            return { data: { user, session }, error: null };
        },
        signUp: async ({ email, password }: any) => {
            await new Promise(r => setTimeout(r, 1000));
            const user = { id: "mock-user-id-" + Math.random(), email };
            const session = { access_token: "mock-token", user };
            await AsyncStorage.setItem('mock_supabase_session', JSON.stringify(session));
            this._notifyChange('SIGNED_IN', session);
            return { data: { user, session }, error: null };
        },
        signOut: async () => {
            await AsyncStorage.removeItem('mock_supabase_session');
            this._notifyChange('SIGNED_OUT', null);
            return { error: null };
        },
        onAuthStateChange: (callback: any) => {
            this._callbacks.push(callback);
            // Fire initial state
            this.auth.getSession().then(({ data }) => {
                if (data.session) callback('SIGNED_IN', data.session);
            });
            return {
                data: {
                    subscription: {
                        unsubscribe: () => {
                            this._callbacks = this._callbacks.filter(cb => cb !== callback);
                        }
                    }
                }
            };
        }
    };

    from(table: string) {
        return {
            upsert: async (data: any) => {
                console.log(`[MockDB] Upsert to ${table}:`, data);
                return { error: null };
            },
            select: () => ({
                eq: () => ({ single: async () => ({ data: null, error: null }) })
            })
        };
    }

    _callbacks: Function[] = [];
    _notifyChange(event: string, session: any) {
        this._callbacks.forEach(cb => cb(event, session));
    }
}

// Ensure the mock is typed as `any` locally to allow export assignment, 
// or rely on TS treating it compatibly enough for usage.
// We cast to SupabaseClient (as any) to satisfy the type system for now.
export const supabase = (isMock
    ? new MockSupabaseClient()
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    })) as unknown as SupabaseClient;

if (isMock) {
    console.log("⚠️ USING MOCK SUPABASE CLIENT (Check .env configuration) ⚠️");
    // setTimeout(() => Alert.alert("Dev Mode", "Running with Mock Supabase Auth.\nUpdate .env with real keys to connect."), 1000);
}
