// Create this as src/pages/DiagnosticTest.tsx
// This will definitively identify the issue

import React, { useEffect, useState } from 'react';

const DiagnosticTest: React.FC = () => {
  const [results, setResults] = useState<any>({});

  useEffect(() => {
    const runDiagnostics = async () => {
      const diagnostics: any = {};

      // 1. Check environment variables
      diagnostics.envVars = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        anonKeyPrefix: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 50),
        anonKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length,
        nodeEnv: import.meta.env.NODE_ENV,
        mode: import.meta.env.MODE
      };

      // 2. Test direct API call without Supabase client
      try {
        const directResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        
        diagnostics.directApi = {
          status: directResponse.status,
          statusText: directResponse.statusText,
          headers: Object.fromEntries(directResponse.headers.entries())
        };

        if (directResponse.status === 401) {
          const errorText = await directResponse.text();
          diagnostics.directApi.errorBody = errorText;
        }
      } catch (error) {
        diagnostics.directApi = { error: String(error) };
      }

      // 3. Test auth endpoint specifically
      try {
        const authResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        
        diagnostics.authEndpoint = {
          status: authResponse.status,
          statusText: authResponse.statusText
        };

        if (authResponse.status === 401) {
          const errorText = await authResponse.text();
          diagnostics.authEndpoint.errorBody = errorText;
        }
      } catch (error) {
        diagnostics.authEndpoint = { error: String(error) };
      }

      // 4. Test if we can reach Supabase at all
      try {
        const pingResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD'
        });
        diagnostics.connectivity = {
          canReachSupabase: true,
          status: pingResponse.status
        };
      } catch (error) {
        diagnostics.connectivity = {
          canReachSupabase: false,
          error: String(error)
        };
      }

      // 5. Test Supabase client creation
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const testClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        );
        
        const { data, error } = await testClient.auth.getSession();
        diagnostics.supabaseClient = {
          clientCreated: true,
          sessionError: error?.message,
          hasSession: !!data.session
        };
      } catch (error) {
        diagnostics.supabaseClient = { error: String(error) };
      }

      setResults(diagnostics);
    };

    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Supabase Diagnostic Test</h1>
        
        <div className="grid gap-6">
          {/* Environment Variables */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(results.envVars, null, 2)}
            </pre>
          </div>

          {/* Direct API Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Direct API Test</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(results.directApi, null, 2)}
            </pre>
          </div>

          {/* Auth Endpoint Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Auth Endpoint Test</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(results.authEndpoint, null, 2)}
            </pre>
          </div>

          {/* Connectivity Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Connectivity Test</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(results.connectivity, null, 2)}
            </pre>
          </div>

          {/* Supabase Client Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Supabase Client Test</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(results.supabaseClient, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticTest;