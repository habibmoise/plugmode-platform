// src/pages/AuthCallback.tsx
// Diagnostic version to check actual environment variables

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Checking configuration...');
  const [envCheck, setEnvCheck] = useState<any>({});

  useEffect(() => {
    const checkEnvironment = () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const envInfo = {
        hasUrl: !!supabaseUrl,
        urlValue: supabaseUrl,
        hasKey: !!supabaseKey,
        keyPrefix: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING',
        keyLength: supabaseKey ? supabaseKey.length : 0,
        expectedUrl: 'https://mxiqidkcthfkrtoptcet.supabase.co',
        urlMatches: supabaseUrl === 'https://mxiqidkcthfkrtoptcet.supabase.co'
      };
      
      setEnvCheck(envInfo);
      
      console.log('Environment Check:', envInfo);
      
      if (!envInfo.hasUrl || !envInfo.hasKey) {
        setStatus('❌ Missing environment variables!');
        return;
      }
      
      if (!envInfo.urlMatches) {
        setStatus('❌ Wrong Supabase URL!');
        return;
      }
      
      if (envInfo.keyLength < 100) {
        setStatus('❌ Supabase key seems too short!');
        return;
      }
      
      setStatus('✅ Environment variables look correct');
      
      // If env vars are good, try the OAuth flow
      setTimeout(() => {
        handleOAuthFlow();
      }, 2000);
    };
    
    const handleOAuthFlow = async () => {
      try {
        setStatus('Processing OAuth tokens...');
        
        // Import supabase only after env check
        const { supabase } = await import('../lib/supabase');
        
        // Extract tokens from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (!accessToken) {
          setStatus('❌ No OAuth tokens found in URL');
          setTimeout(() => navigate('/signup?error=no_tokens'), 3000);
          return;
        }
        
        console.log('Setting session with tokens...');
        setStatus('Creating authenticated session...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus(`❌ Session failed: ${sessionError.message}`);
          setTimeout(() => navigate('/signup?error=session_failed'), 3000);
          return;
        }
        
        if (!sessionData.session?.user) {
          setStatus('❌ No user in session');
          setTimeout(() => navigate('/signup?error=no_user'), 3000);
          return;
        }
        
        setStatus('✅ Authentication successful! Creating profile...');
        
        const user = sessionData.session.user;
        
        // Create user profile
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            first_name: user.user_metadata?.given_name || '',
            last_name: user.user_metadata?.family_name || '',
            avatar_url: user.user_metadata?.avatar_url,
            subscription_tier: 'free'
          }, { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Profile creation error:', upsertError);
        }
        
        setStatus('🎉 Success! Redirecting to dashboard...');
        
        setTimeout(() => {
          navigate('/dashboard?onboarding=true');
        }, 2000);
        
      } catch (error) {
        console.error('OAuth flow error:', error);
        setStatus(`❌ Error: ${error}`);
        setTimeout(() => navigate('/signup?error=oauth_failed'), 3000);
      }
    };

    checkEnvironment();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Diagnosing Google OAuth</h2>
        <p className="text-gray-600 mb-6">{status}</p>
        
        {/* Environment Check Display */}
        <div className="bg-gray-50 border rounded-lg p-4 text-left">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Environment Variables:</h3>
          <div className="text-xs space-y-2">
            <div className={`p-2 rounded ${envCheck.hasUrl ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>Supabase URL:</strong> {envCheck.hasUrl ? '✅ Present' : '❌ Missing'}
              <br />
              <span className="font-mono">{envCheck.urlValue || 'MISSING'}</span>
            </div>
            
            <div className={`p-2 rounded ${envCheck.hasKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>Supabase Key:</strong> {envCheck.hasKey ? '✅ Present' : '❌ Missing'}
              <br />
              <span className="font-mono">{envCheck.keyPrefix}</span>
              <br />
              <small>Length: {envCheck.keyLength} characters</small>
            </div>
            
            <div className={`p-2 rounded ${envCheck.urlMatches ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              <strong>URL Match:</strong> {envCheck.urlMatches ? '✅ Correct' : '⚠️ Mismatch'}
              <br />
              <small>Expected: {envCheck.expectedUrl}</small>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-blue-800 text-sm">
            🔍 Checking configuration before processing OAuth...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;