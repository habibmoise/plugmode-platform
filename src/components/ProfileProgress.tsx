import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, User, FileText, MapPin, Briefcase, Target, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileProgressProps {
  className?: string;
  showDetails?: boolean;
}

interface ProfileData {
  name: string | null;
  location: string | null;
  skills: string[] | null;
  experience_level: string | null;
  hasResume: boolean;
  avatar_url: string | null;
}

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ComponentType<any>;
  points: number;
  action?: string;
  actionLink?: string;
}

export function ProfileProgress({ className = '', showDetails = true }: ProfileProgressProps) {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(0);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('name, location, skills, experience_level, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      // Check if user has uploaded resume
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const profile: ProfileData = {
        name: userData?.name || null,
        location: userData?.location || null,
        skills: userData?.skills || null,
        experience_level: userData?.experience_level || null,
        hasResume: (resumeData && resumeData.length > 0) || false,
        avatar_url: userData?.avatar_url || null,
      };

      setProfileData(profile);
      calculateCompletion(profile);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = (profile: ProfileData) => {
    let totalPoints = 0;
    let earnedPoints = 0;

    const steps = getProgressSteps(profile);
    steps.forEach(step => {
      totalPoints += step.points;
      if (step.completed) {
        earnedPoints += step.points;
      }
    });

    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    setCompletion(percentage);
  };

  const getProgressSteps = (profile: ProfileData): ProgressStep[] => [
    {
      id: 'account',
      title: 'Account Created',
      description: 'Welcome to PlugMode!',
      completed: true,
      icon: CheckCircle,
      points: 5
    },
    {
      id: 'name',
      title: 'Add Your Name',
      description: 'Help employers know who you are',
      completed: !!profile?.name,
      icon: User,
      points: 15,
      action: 'Add name',
      actionLink: '/profile'
    },
    {
      id: 'location',
      title: 'Set Location',
      description: 'Show your regional expertise',
      completed: !!profile?.location,
      icon: MapPin,
      points: 15,
      action: 'Add location',
      actionLink: '/profile'
    },
    {
      id: 'experience',
      title: 'Define Experience Level',
      description: 'Define your career stage',
      completed: !!profile?.experience_level,
      icon: Briefcase,
      points: 15,
      action: 'Set experience',
      actionLink: '/profile'
    },
    {
      id: 'skills',
      title: 'Add Skills',
      description: 'Showcase your expertise',
      completed: !!(profile?.skills && profile.skills.length > 0),
      icon: Target,
      points: 20,
      action: 'Add skills',
      actionLink: '/profile'
    },
    {
      id: 'avatar',
      title: 'Upload Profile Picture',
      description: 'Personalize your profile and stand out',
      completed: !!profile?.avatar_url,
      icon: Image,
      points: 15,
      action: 'Upload picture',
      actionLink: '/profile'
    },
    {
      id: 'resume',
      title: 'Upload Resume',
      description: 'Complete your professional profile',
      completed: !!profile?.hasResume,
      icon: FileText,
      points: 15,
      action: 'Upload resume',
      actionLink: '/profile'
    }
  ];

  const getNextStep = () => {
    if (!profileData) return null;
    const steps = getProgressSteps(profileData);
    return steps.find(step => !step.completed);
  };

  const getCompletionColor = () => {
    if (completion >= 80) return 'text-green-600';
    if (completion >= 50) return 'text-blue-600';
    return 'text-orange-600';
  };

  const getProgressBarColor = () => {
    if (completion >= 80) return 'bg-green-600';
    if (completion >= 50) return 'bg-blue-600';
    return 'bg-orange-600';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-lg animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-2 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profileData) return null;

  const steps = getProgressSteps(profileData);
  const nextStep = getNextStep();

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-black">Profile Completion</h3>
            <p className="text-gray-600">Boost your job matching potential</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getCompletionColor()}`}>{completion}%</div>
          <div className="text-sm text-gray-600">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${completion}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Getting started</span>
          <span>Profile complete</span>
        </div>
      </div>

      {/* Next Step Highlight */}
      {nextStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <nextStep.icon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Next: {nextStep.title}</h4>
              <p className="text-blue-700 text-sm">{nextStep.description}</p>
            </div>
            {nextStep.actionLink && (
              <Link
                to={nextStep.actionLink}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {nextStep.action}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Detailed Steps */}
      {showDetails && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">Progress Breakdown</h4>
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`p-1 rounded-full ${step.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <span className={`text-sm font-medium ${step.completed ? 'text-green-700' : 'text-gray-700'}`}>
                  {step.title}
                </span>
                <span className="text-gray-500 text-xs ml-2">+{step.points} pts</span>
              </div>
              {!step.completed && step.actionLink && (
                <Link
                  to={step.actionLink}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {step.action}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completion Reward */}
      {completion === 100 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="font-medium text-green-900">Profile Complete! 🎉</h4>
              <p className="text-green-700 text-sm">You're now eligible for premium job matches and AI coaching.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}