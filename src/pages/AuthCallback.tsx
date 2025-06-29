// src/pages/AuthCallback.tsx
// Alternative approach - let Supabase handle the OAuth flow automatically

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, message]);
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        addDebug('🔍 Starting alternative OAuth handling...');
        
        // Wait a moment for Supabase to process the OAuth
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStatus('Checking authentication status...');
        
        // Let Supabase handle the OAuth callback automatically
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        addDebug(`📊 Session check result: ${sessionError ? 'ERROR' : 'SUCCESS'}`);
        
        if (sessionError) {
          addDebug(`❌ Session error: ${sessionError.message}`);
          
          // Try alternative: listen for auth state change
          addDebug('🔄 Trying auth state listener...');
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              addDebug(`🔔 Auth event: ${event}`);
              
              if (event === 'SIGNED_IN' && session) {
                addDebug('✅ Successfully signed in via state change');
                subscription.unsubscribe();
                await handleSuccessfulAuth(session.user);
              } else if (event === 'SIGNED_OUT') {
                addDebug('❌ User signed out');
                navigate('/signup?error=signed_out');
              }
            }
          );
          
          // Clean up subscription after 10 seconds
          setTimeout(() => {
            subscription.unsubscribe();
            addDebug('⏰ Auth listener timeout');
            navigate('/signup?error=timeout');
          }, 10000);
          
          return;
        }

        if (sessionData.session && sessionData.session.user) {
          addDebug('✅ Session found immediately');
          await handleSuccessfulAuth(sessionData.session.user);
        } else {
          addDebug('❌ No session found, redirecting to signup');
          setTimeout(() => navigate('/signup?error=no_session'), 2000);
        }
        
      } catch (error) {
        addDebug(`💥 Unexpected error: ${error}`);
        console.error('Auth callback failed:', error);
        setStatus('Authentication failed');
        setTimeout(() => navigate('/signup?error=callback_failed'), 3000);
      }
    };

    const handleSuccessfulAuth = async (user: any) => {
      try {
        addDebug(`👤 Processing user: ${user.email}`);
        setStatus('Setting up your profile...');
        
        // Check if user exists in our database
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('id, subscription_tier')
          .eq('id', user.id)
          .single();
        
        if (selectError && selectError.code !== 'PGRST116') {
          addDebug(`⚠️ Select error (continuing anyway): ${selectError.message}`);
        }
        
        if (!existingUser) {
          addDebug('👤 Creating new user record...');
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
              first_name: user.user_metadata?.given_name || '',
              last_name: user.user_metadata?.family_name || '',
              avatar_url: user.user_metadata?.avatar_url,
              subscription_tier: 'free'
            });

          if (insertError) {
            addDebug(`⚠️ Insert error (continuing anyway): ${insertError.message}`);
          } else {
            addDebug('✅ User record created');
          }
        } else {
          addDebug('✅ User already exists');
        }
        
        setStatus('Success! Redirecting to dashboard...');
        addDebug('🚀 Redirecting to dashboard');
        
        setTimeout(() => {
          navigate('/dashboard?onboarding=true');
        }, 1500);
        
      } catch (error) {
        addDebug(`💥 Error in handleSuccessfulAuth: ${error}`);
        setTimeout(() => navigate('/signup?error=profile_creation_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Completing Google Sign-up</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        
        {/* Debug Info Panel */}
        <div className="bg-gray-50 border rounded-lg p-4 mt-6 text-left">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Authentication Progress:</h3>
          <div className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
            {debugInfo.map((info, index) => (
              <div key={index}>{info}</div>
            ))}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-blue-800 text-sm">
            🔄 Using alternative OAuth handling method...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;