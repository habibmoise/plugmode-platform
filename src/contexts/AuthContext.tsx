import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, location: string, careerGoal: string, skills?: string[], experienceLevel?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  logUserEvent: (eventType: string, eventData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log user events for automation
        if (event === 'SIGNED_UP' && session?.user) {
          await logUserEvent(session.user.id, 'user_signup', {
            email: session.user.email,
            timestamp: new Date().toISOString()
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logUserEvent = async (userId: string, eventType: string, eventData: any) => {
    try {
      await supabase.from('user_events').insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData
      });
    } catch (error) {
      console.error('Error logging user event:', error);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, location: string, careerGoal: string, skills: string[] = [], experienceLevel?: string) => {
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName: firstName,
          lastName: lastName,
          name: fullName
        }
      }
    });

    if (data.user && !error) {
      // Create user profile with first name, last name, location and career goal
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email!,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        location: location,
        skills: skills,
        experience_level: experienceLevel,
        automation_preferences: {
          career_goal: careerGoal
        }
      });
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Enhanced success message with user name
      const userName = user?.user_metadata?.firstName || 
                       user?.user_metadata?.name || 
                       user?.email?.split('@')[0] || 
                       'there';
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Show enhanced goodbye message
      try {
        // Try to use toast if available (check if showToast exists in window context)
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast({
            type: 'success',
            title: `See you later, ${userName}! 👋`,
            message: 'You have been securely logged out. Thanks for using PlugMode!'
          });
        } else {
          // Fallback to enhanced alert
          alert(`👋 Goodbye ${userName}! You have been logged out successfully.\n\nThanks for using PlugMode - we can't wait to see you again!`);
        }
      } catch (toastError) {
        // Final fallback
        alert(`✅ Successfully logged out! See you soon, ${userName}!`);
      }
      
      // Redirect to home page with a slight delay to show message
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Enhanced error message
      const userName = user?.user_metadata?.firstName || 
                       user?.user_metadata?.name || 
                       'there';
      
      try {
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast({
            type: 'error',
            title: 'Logout Issue 😕',
            message: 'Had trouble logging you out completely. Please close your browser to ensure you\'re fully signed out.'
          });
        } else {
          alert(`❌ Hi ${userName}, we had trouble logging you out completely.\n\nFor your security, please close your browser window.`);
        }
      } catch (toastError) {
        alert('❌ Had trouble logging out. Please close your browser for security.');
      }
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    logUserEvent: (eventType: string, eventData: any) => {
      if (user) {
        return logUserEvent(user.id, eventType, eventData);
      }
      return Promise.resolve();
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}