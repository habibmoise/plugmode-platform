// src/pages/AuthCallback.tsx
// Debug version to identify the exact issue

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Starting authentication...');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, message]);
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        addDebug('🔍 AuthCallback started');
        addDebug(`📍 Current URL: ${window.location.href}`);
        addDebug(`🔑 Supabase URL: ${import.meta.env.VITE_SUPABASE_URL}`);
        addDebug(`🔐 Has Anon Key: ${!!import.meta.env.VITE_SUPABASE_ANON_KEY}`);
        
        setStatus('Checking URL parameters...');
        
        // Check for hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        addDebug(`🎫 Access Token found: ${!!accessToken}`);
        addDebug(`🔄 Refresh Token found: ${!!refreshToken}`);
        
        if (accessToken) {
          addDebug('✅ OAuth tokens found in URL');
          setStatus('Processing OAuth tokens...');
          
          // Set the session from the tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (sessionError) {
            addDebug(`❌ Session error: ${sessionError.message}`);
            setStatus('Session creation failed');
            setTimeout(() => navigate('/signup?error=session_failed'), 3000);
            return;
          }
          
          addDebug('✅ Session created successfully');
          setStatus('Session created! Getting user info...');
          
          const user = sessionData.session?.user;
          if (!user) {
            addDebug('❌ No user in session data');
            setStatus('No user found in session');
            setTimeout(() => navigate('/signup?error=no_user'), 3000);
            return;
          }
          
          addDebug(`👤 User ID: ${user.id}`);
          addDebug(`📧 User Email: ${user.email}`);
          
          setStatus('Creating user profile...');
          
          // Try to create/update user record
          const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();
          
          if (selectError && selectError.code !== 'PGRST116') {
            addDebug(`❌ Database select error: ${selectError.message}`);
          }
          
          if (!existingUser) {
            addDebug('👤 Creating new user record...');
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
              addDebug(`❌ User creation error: ${insertError.message}`);
              // Continue anyway - user might already exist
            } else {
              addDebug('✅ User record created successfully');
            }
          } else {
            addDebug('✅ User record already exists');
          }
          
          setStatus('Success! Redirecting to dashboard...');
          addDebug('🚀 Redirecting to dashboard with onboarding');
          
          setTimeout(() => {
            navigate('/dashboard?onboarding=true');
          }, 2000);
          
        } else {
          addDebug('❌ No OAuth tokens found in URL');
          setStatus('No authentication tokens found');
          
          // Try getting existing session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            addDebug(`❌ Get session error: ${sessionError.message}`);
          }
          
          if (sessionData.session) {
            addDebug('✅ Found existing session, redirecting...');
            navigate('/dashboard');
          } else {
            addDebug('❌ No existing session found');
            setTimeout(() => navigate('/signup?error=no_tokens'), 3000);
          }
        }
        
      } catch (error) {
        addDebug(`💥 Unexpected error: ${error}`);
        console.error('Auth callback failed:', error);
        setStatus('Authentication failed');
        setTimeout(() => navigate('/signup?error=callback_failed'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Google Authentication</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        
        {/* Debug Info Panel */}
        <div className="bg-gray-50 border rounded-lg p-4 mt-6 text-left">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Debug Information:</h3>
          <div className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
            {debugInfo.map((info, index) => (
              <div key={index}>{info}</div>
            ))}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-blue-800 text-sm">
            🔍 Debugging Google OAuth flow...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;