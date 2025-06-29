// src/pages/AuthCallback.tsx
// Final version that properly handles the OAuth session

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Detecting OAuth session...');
        
        // Wait for Supabase to automatically detect and set the session from URL
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for the session after Supabase has processed the URL
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => navigate('/signup?error=session_failed'), 2000);
          return;
        }

        if (!sessionData.session || !sessionData.session.user) {
          console.log('No session found, trying auth state listener...');
          setStatus('Waiting for authentication...');
          
          // Use auth state change listener as fallback
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('Auth state change:', event, !!session);
              
              if (event === 'SIGNED_IN' && session?.user) {
                subscription.unsubscribe();
                await createUserAndRedirect(session.user);
              }
            }
          );
          
          // Timeout after 10 seconds
          setTimeout(() => {
            subscription.unsubscribe();
            console.log('Auth timeout, redirecting to signup');
            navigate('/signup?error=auth_timeout');
          }, 10000);
          
          return;
        }

        // We have a session, proceed
        await createUserAndRedirect(sessionData.session.user);
        
      } catch (error) {
        console.error('Auth callback failed:', error);
        setStatus('Authentication failed');
        setTimeout(() => navigate('/signup?error=callback_failed'), 3000);
      }
    };

    const createUserAndRedirect = async (user: any) => {
      try {
        setStatus('Setting up your profile...');
        console.log('Creating user profile for:', user.email);
        
        // Try to create user record (ignore if already exists)
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            first_name: user.user_metadata?.given_name || '',
            last_name: user.user_metadata?.family_name || '',
            avatar_url: user.user_metadata?.avatar_url,
            subscription_tier: 'free',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('User creation error:', insertError);
        }
        
        setStatus('Success! Welcome to PlugMode!');
        console.log('Redirecting to dashboard...');
        
        setTimeout(() => {
          navigate('/dashboard?onboarding=true');
        }, 1500);
        
      } catch (error) {
        console.error('Error creating user profile:', error);
        // Redirect to dashboard anyway - user is authenticated
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to PlugMode!</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            🎉 Completing your Google sign-up...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;