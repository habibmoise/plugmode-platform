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

// Helper function to clean error messages - remove backend details
const sanitizeErrorMessage = (message: string): string => {
  return message
    .replace(/\[mxiqidkcthfkrtoptcet\]/g, 'PlugMode')
    .replace(/supabase/gi, 'our system')
    .replace(/postgres/gi, 'database')
    .replace(/RLS/gi, 'security')
    .replace(/JWT/gi, 'authentication')
    .replace(/function.*?\(\)/gi, 'system process')
    .replace(/schema.*?error/gi, 'data error')
    .replace(/constraint.*?violation/gi, 'data validation error')
    .replace(/duplicate key/gi, 'this information already exists')
    .replace(/connection.*?refused/gi, 'connection issue')
    .replace(/timeout/gi, 'request took too long')
    .replace(/invalid.*?api.*?key/gi, 'authentication issue');
};

// Helper function to show toast or fallback to alert
const showUserMessage = (type: 'success' | 'error', title: string, message: string) => {
  try {
    // Try to use toast if available
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        type,
        title: sanitizeErrorMessage(title),
        message: sanitizeErrorMessage(message)
      });
    } else {
      // Fallback to enhanced alert
      const emoji = type === 'success' ? '✅' : '❌';
      alert(`${emoji} ${sanitizeErrorMessage(title)}\n\n${sanitizeErrorMessage(message)}`);
    }
  } catch (toastError) {
    // Final fallback
    const emoji = type === 'success' ? '✅' : '❌';
    alert(`${emoji} ${sanitizeErrorMessage(title)}`);
  }
};

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

        // Log user events for automation (clean messages)
        if (event.toString() === 'SIGNED_UP' && session?.user) {
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
      // Don't show user-facing errors for logging - it's background operation
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, location: string, careerGoal: string, skills: string[] = [], experienceLevel?: string) => {
    try {
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

      if (error) {
        // Clean error messages for users
        let userFriendlyMessage = 'Something went wrong during signup.';
        
        if (error.message.includes('email')) {
          userFriendlyMessage = 'This email is already registered. Try logging in instead.';
        } else if (error.message.includes('password')) {
          userFriendlyMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('rate limit')) {
          userFriendlyMessage = 'Too many signup attempts. Please wait a few minutes and try again.';
        } else if (error.message.includes('invalid')) {
          userFriendlyMessage = 'Please check your email format and password.';
        }
        
        return { data: null, error: { message: userFriendlyMessage } };
      }

      if (data.user) {
        try {
          // Create user profile with clean error handling
          const { error: profileError } = await supabase.from('users').insert({
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

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't expose database errors to users
            return { 
              data: null, 
              error: { message: 'Account created but profile setup incomplete. Please contact support.' }
            };
          }

          // Success! Show welcome message
          showUserMessage(
            'success',
            `Welcome to PlugMode, ${firstName}! 🎉`,
            'Your account is ready! Let\'s start building your global career.'
          );

          return { data, error: null };
        } catch (profileError) {
          console.error('Profile creation failed:', profileError);
          return { 
            data: null, 
            error: { message: 'Account created but profile setup failed. Please contact support.' }
          };
        }
      }

      return { data: null, error: { message: 'Account creation failed. Please try again.' } };
      
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        data: null, 
        error: { message: 'Signup failed. Please check your connection and try again.' }
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Clean error messages for users
        let userFriendlyMessage = 'Login failed. Please check your credentials.';
        
        if (error.message.includes('Invalid login credentials')) {
          userFriendlyMessage = 'Incorrect email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userFriendlyMessage = 'Please check your email and confirm your account first.';
        } else if (error.message.includes('rate limit')) {
          userFriendlyMessage = 'Too many login attempts. Please wait a few minutes.';
        } else if (error.message.includes('invalid')) {
          userFriendlyMessage = 'Please check your email and password format.';
        }
        
        return { data: null, error: { message: userFriendlyMessage } };
      }

      if (data.user) {
        // Welcome back message
        const userName = data.user.user_metadata?.firstName || 
                        data.user.user_metadata?.name || 
                        data.user.email?.split('@')[0] || 
                        'there';
        
        showUserMessage(
          'success',
          `Welcome back, ${userName}! 👋`,
          'Ready to discover amazing opportunities today?'
        );
        
        return { data, error: null };
      }

      return { data: null, error: { message: 'Login failed. Please try again.' } };
      
    } catch (error) {
      console.error('Login error:', error);
      return { 
        data: null, 
        error: { message: 'Login failed. Please check your connection and try again.' }
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Get user's name for personalized message
      const userName = user?.user_metadata?.firstName || 
                       user?.user_metadata?.name || 
                       user?.email?.split('@')[0] || 
                       'there';
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setLoading(false);
      
      // Show enhanced goodbye message (NO project IDs or backend details)
      showUserMessage(
        'success',
        `See you later, ${userName}! 👋`,
        'You have been securely logged out. Thanks for using PlugMode!'
      );
      
      // Redirect to home page with a slight delay to show message
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Enhanced error message (NO technical details)
      const userName = user?.user_metadata?.firstName || 
                       user?.user_metadata?.name || 
                       'there';
      
      showUserMessage(
        'error',
        'Logout Issue',
        `Hi ${userName}, we had trouble logging you out completely. For your security, please close your browser window.`
      );
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