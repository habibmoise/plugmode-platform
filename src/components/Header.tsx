import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  isPublic?: boolean;
}

export function Header({ isPublic = false }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isPublic) {
      loadUserProfileData();
    }
  }, [user, isPublic]);

  const loadUserProfileData = async () => {
    if (!user) return;

    try {
      // First try to get name from user metadata (signup)
      const metadataName = user.user_metadata?.firstName || user.user_metadata?.name;
      
      if (metadataName) {
        setUserName(metadataName);
      }

      // Get name and avatar from users table
      const { data, error } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile data:', error);
        setUserName(user.email?.split('@')[0] || 'User');
        setAvatarUrl(null);
        return;
      }

      if (data?.name) {
        // Extract first name from full name for display
        const firstName = data.name.split(' ')[0];
        setUserName(firstName);
      } else if (!metadataName) {
        setUserName(user.email?.split('@')[0] || 'User');
      }

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      } else {
        setAvatarUrl(null);
      }
    } catch (error) {
      console.error('Error loading user profile data:', error);
      setUserName(user.email?.split('@')[0] || 'User');
      setAvatarUrl(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getDisplayName = () => {
    if (userName) return userName;
    return user?.email?.split('@')[0] || 'User';
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const isActivePage = (path: string) => {
    return location.pathname === path;
  };

  const getNavLinkClass = (path: string) => {
    return isActivePage(path)
      ? 'text-blue-600 font-bold transition-colors'
      : 'text-gray-600 hover:text-black transition-colors font-medium';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <img 
              src="/no BG Logo angulaire de PLUGMODE-modified-Photoroom.png" 
              alt="PlugMode" 
              className="h-28 w-28"
            />
          </Link>

          {isPublic ? (
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-black transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <>
              {/* Navigation for authenticated users */}
              <nav className="hidden md:flex space-x-6">
                <Link to="/dashboard" className={getNavLinkClass('/dashboard')}>
                  Dashboard
                </Link>
                <Link to="/jobs" className={getNavLinkClass('/jobs')}>
                  Jobs
                </Link>
                <Link to="/saved-jobs" className={getNavLinkClass('/saved-jobs')}>
                  Saved Jobs
                </Link>
                <Link to="/applications" className={getNavLinkClass('/applications')}>
                  Applications
                </Link>
              </nav>

              <div className="flex items-center space-x-4">
                <Link 
                  to="/profile" 
                  className={`flex items-center space-x-2 transition-colors group ${
                    isActivePage('/profile') 
                      ? 'text-blue-600' 
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="User Avatar" 
                      className={`h-8 w-8 rounded-full object-cover border-2 transition-colors ${
                        isActivePage('/profile')
                          ? 'border-blue-500'
                          : 'border-gray-300 group-hover:border-blue-500'
                      }`}
                    />
                  ) : (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isActivePage('/profile')
                        ? 'bg-blue-200 text-blue-600'
                        : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                    }`}>
                      {getInitials(getDisplayName())}
                    </div>
                  )}
                  <span className="text-sm font-medium">{getDisplayName()}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-gray-600 hover:text-black transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}