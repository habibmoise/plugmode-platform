import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Verifying your Google account...');
        
        // Get the session from URL parameters
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Authentication failed. Redirecting to signup...');
          setTimeout(() => navigate('/signup?error=auth_failed'), 2000);
          return;
        }

        if (data.session && data.session.user) {
          setStatus('Authentication successful! Setting up your account...');
          
          const user = data.session.user;
          
          // Check if user record exists in our database
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!existingUser) {
            // Create user record for Google OAuth users
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
              });

            if (insertError) {
              console.error('Error creating user record:', insertError);
              setStatus('Error setting up account. Please try again.');
              setTimeout(() => navigate('/signup'), 2000);
              return;
            }
          }

          // Check if user needs onboarding (missing location or career goal)
          const needsOnboarding = !existingUser?.location || !existingUser?.automation_preferences;

          setStatus('Redirecting to your dashboard...');
          
          setTimeout(() => {
            if (needsOnboarding) {
              navigate('/dashboard?onboarding=true');
            } else {
              navigate('/dashboard');
            }
          }, 1500);
          
        } else {
          setStatus('No active session found. Redirecting...');
          setTimeout(() => navigate('/signup'), 2000);
        }
        
      } catch (error) {
        console.error('Auth callback failed:', error);
        setStatus('Something went wrong. Redirecting to signup...');
        setTimeout(() => navigate('/signup?error=callback_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to PlugMode</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            🚀 Setting up your account with Google...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;