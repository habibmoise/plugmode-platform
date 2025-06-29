// src/pages/AuthCallback.tsx
// Simplified version that focuses on getting users to dashboard

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing your signup...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Verifying your account...');
        
        // Get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => navigate('/signup'), 2000);
          return;
        }

        if (!sessionData.session || !sessionData.session.user) {
          console.error('No session found');
          setStatus('No active session. Redirecting...');
          setTimeout(() => navigate('/signup'), 2000);
          return;
        }

        const user = sessionData.session.user;
        setStatus('Setting up your profile...');

        // Try to create user record (will fail silently if exists)
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            first_name: user.user_metadata?.given_name || '',
            last_name: user.user_metadata?.family_name || '',
            avatar_url: user.user_metadata?.avatar_url,
            subscription_tier: 'free'
          })
          .select()
          .single();

        // Ignore duplicate key errors - user already exists
        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('Insert error (non-duplicate):', insertError);
        }

        setStatus('Success! Redirecting to your dashboard...');
        
        // Always redirect to dashboard - let dashboard handle onboarding
        setTimeout(() => {
          navigate('/dashboard?onboarding=true');
        }, 1500);

      } catch (error) {
        console.error('Auth callback failed:', error);
        setStatus('Something went wrong. Redirecting...');
        setTimeout(() => navigate('/signup'), 2000);
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
            🎉 Your Google account has been connected successfully!
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;