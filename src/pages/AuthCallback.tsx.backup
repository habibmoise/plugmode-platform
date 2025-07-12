import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing your authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session after OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => navigate('/signup?error=auth_failed'), 2000);
          return;
        }

        if (session && session.user) {
          setStatus('Creating your account...');
          
          // Check if user record exists in public.users table
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            console.error('Error checking user:', userError);
          }

          // Create user record if it doesn't exist
          if (!existingUser) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Google User',
                profile_picture: session.user.user_metadata?.avatar_url,
                created_at: new Date().toISOString(),
              });

            if (insertError) {
              console.error('Error creating user record:', insertError);
              // Continue anyway - auth was successful
            }
          }

          setStatus('Almost done! Setting up your dashboard...');
          
          // Redirect to dashboard with onboarding flag for Google OAuth users
          setTimeout(() => {
            navigate('/dashboard?onboarding=true');
          }, 1500);
        } else {
          setStatus('No active session found. Redirecting...');
          setTimeout(() => {
            navigate('/signup');
          }, 2000);
        }
      } catch (error) {
        console.error('Auth callback failed:', error);
        setStatus('Something went wrong. Redirecting...');
        
        setTimeout(() => {
          navigate('/signup?error=callback_failed');
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto">
        <div className="mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to PlugMode! 🎉
        </h2>
        
        <p className="text-gray-600 mb-4">{status}</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            🚀 Setting up your personalized career dashboard...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;