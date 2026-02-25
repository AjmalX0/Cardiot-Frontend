import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSession as fetchSession, logout as apiLogout } from './api';
import { User, Session } from '@supabase/supabase-js'; // the types

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    updateAuth: (sessionData: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        try {
            const localSessionStr = localStorage.getItem('supabase_session');
            let localSession = null;
            if (localSessionStr) {
                try {
                    localSession = JSON.parse(localSessionStr);
                    setSession(localSession.session);
                    setUser(localSession.session?.user ?? null);
                } catch (e) { }
            }

            const response = await fetchSession();
            if (response?.session) {
                // Merge or rely on backend validation
                setSession(response.session);
                setUser(response.session.user);
            } else {
                setSession(null);
                setUser(null);
                localStorage.removeItem('supabase_session');
            }
        } catch (error) {
            console.error('Session check failed', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const signOut = async () => {
        setLoading(true);
        try {
            await apiLogout();
        } catch (e) { }
        localStorage.removeItem('supabase_session');
        setSession(null);
        setUser(null);
        setLoading(false);
    };

    const updateAuth = (sessionData: any) => {
        localStorage.setItem('supabase_session', JSON.stringify({ session: sessionData }));
        setSession(sessionData);
        setUser(sessionData.user ?? null);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut, updateAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
