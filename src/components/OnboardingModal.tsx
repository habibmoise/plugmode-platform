import React, { useState } from 'react';
import { X, MapPin, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [location, setLocation] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({ location })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update automation preferences
      const { error: prefsError } = await supabase
        .from('automation_preferences')
        .upsert({
          user_id: user.id,
          career_goal: careerGoal,
          updated_at: new Date().toISOString()
        });

      if (prefsError) throw prefsError;

      showToast({
        type: 'success',
        title: 'Profile completed!',
        message: 'Welcome to PlugMode! Your preferences have been saved.'
      });

      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      showToast({
        type: 'error',
        title: 'Update failed',
        message: 'Failed to save your preferences. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Complete Your Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin size={16} className="inline mr-1" />
              Where are you located?
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Lagos, Nigeria"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Target size={16} className="inline mr-1" />
              What's your career goal?
            </label>
            <select
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your goal</option>
              <option value="get_first_job">Get my first tech job</option>
              <option value="level_up">Level up my current role</option>
              <option value="switch_careers">Switch to tech</option>
              <option value="remote_work">Find remote work</option>
              <option value="freelance">Start freelancing</option>
              <option value="leadership">Move into leadership</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingModal;