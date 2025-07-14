import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, employeeCode: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser, retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        // If user profile doesn't exist and this is a new signup, wait and retry
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log('User profile not found, retrying...', retryCount + 1);
          setTimeout(() => {
            fetchUserProfile(supabaseUser, retryCount + 1);
          }, 1000); // Wait 1 second and retry
          return;
        }
        throw error;
      }
      
      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // If profile still doesn't exist after retries, sign out the user
      if (retryCount >= 3) {
        console.error('Failed to create user profile after signup');
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, employeeCode: string, fullName: string) => {
    const { signUp: supabaseSignUp } = await import('../lib/supabase');
    await supabaseSignUp(email, password, employeeCode, fullName);
  };

  const signIn = async (email: string, password: string) => {
    const { signIn: supabaseSignIn } = await import('../lib/supabase');
    await supabaseSignIn(email, password);
  };

  const signOut = async () => {
    const { signOut: supabaseSignOut } = await import('../lib/supabase');
    await supabaseSignOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};