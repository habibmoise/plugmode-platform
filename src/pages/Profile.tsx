import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import ResumeUpload from '../components/ResumeUpload';
import { ProfilePictureUpload } from '../components/ProfilePictureUpload';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { countries } from './Signup';
import { User, MapPin, Briefcase, Save, FileText, Trash2, ArrowLeft, Plus, X } from 'lucide-react';

interface Resume {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  processing_status: string;
  processing_error: string | null;
}

export function Profile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    location: '',
    skills: [] as string[],
    experience_level: '',
    avatar_url: null as string | null,
  });

  useEffect(() => {
    loadProfile();
    loadResumes();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, location, skills, experience_level, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        // Parse full name into first and last name
        const nameParts = data.name ? data.name.split(' ') : [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setFormData({
          firstName,
          lastName,
          location: data.location || '',
          skills: data.skills || [],
          experience_level: data.experience_level || '',
          avatar_url: data.avatar_url || null,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast({
        type: 'error',
        title: 'Error Loading Profile',
        message: 'Failed to load your profile data. Please refresh the page.'
      });
    }
  };

  const loadResumes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('id, file_name, file_size, uploaded_at, processing_status, processing_error')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error) {
      console.error('Error loading resumes:', error);
      showToast({
        type: 'error',
        title: 'Error Loading Resumes',
        message: 'Failed to load your resumes. Please refresh the page.'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Combine first and last name for storage
      const fullName = formData.lastName 
        ? `${formData.firstName} ${formData.lastName}` 
        : formData.firstName;

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          name: fullName,
          location: formData.location,
          skills: formData.skills,
          experience_level: formData.experience_level,
          avatar_url: formData.avatar_url,
        });

      if (error) throw error;

      // Log profile update event for automation
      await supabase.from('user_events').insert({
        user_id: user.id,
        event_type: 'profile_updated',
        event_data: {
          fields_updated: ['name', 'location', 'skills', 'experience_level'],
          timestamp: new Date().toISOString()
        }
      });

      showToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully!'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update your profile. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkillAdd = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill]
      });
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleNewSkillAdd = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      handleSkillAdd(newSkill.trim());
      setNewSkill('');
    }
  };

  const handleNewSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNewSkillAdd();
    }
  };

  const deleteResume = async (resumeId: string) => {
    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (error) throw error;
      
      setResumes(prev => prev.filter(resume => resume.id !== resumeId));
      showToast({
        type: 'success',
        title: 'Resume Deleted',
        message: 'Resume has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting resume:', error);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete resume. Please try again.'
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const popularSkills = [
    // Tech Skills
    'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'SQL',
    'AWS', 'Docker', 'Git', 'HTML/CSS', 'Java', 'C++', 'PHP', 'Ruby',
    'Vue.js', 'Angular', 'MongoDB', 'PostgreSQL', 'Redis', 'Kubernetes',
    
    // Marketing & Content
    'Digital Marketing', 'SEO', 'Content Writing', 'Social Media', 'Google Ads', 'Email Marketing',
    'Copywriting', 'Content Strategy', 'Brand Management', 'Marketing Analytics',
    
    // Sales & Business
    'CRM', 'Salesforce', 'Lead Generation', 'Customer Relations', 'B2B Sales',
    'Account Management', 'Business Development', 'Sales Strategy',
    
    // Design & Creative
    'Photoshop', 'Illustrator', 'Canva', 'Video Editing', 'Branding', 'UI/UX Design',
    'Graphic Design', 'Adobe Creative Suite', 'Figma', 'Sketch',
    
    // Business & Operations
    'Excel', 'Data Analysis', 'Project Management', 'Process Improvement',
    'Business Analysis', 'Operations Management', 'Supply Chain', 'Finance',
    
    // Languages (valuable for global roles)
    'English', 'Spanish', 'French', 'Portuguese', 'Mandarin', 'Arabic',
    
    // Soft Skills
    'Communication', 'Remote Work', 'Time Management', 'Cross-cultural',
    'Leadership', 'Problem Solving', 'Team Collaboration', 'Adaptability'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              to="/dashboard"
              className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">Profile Settings</h1>
          <p className="text-gray-600">
            Complete your profile to get better job matches and opportunities
          </p>
        </div>

        <div className="space-y-8">
          {/* Profile Picture Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-black">Profile Picture</h2>
                  <p className="text-gray-600">Upload a photo to personalize your profile</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ProfilePictureUpload 
                onUploadComplete={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                currentAvatarUrl={formData.avatar_url}
              />
            </div>
          </div>

          {/* Resume Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-black">Resume</h2>
                  <p className="text-gray-600">Upload your resume for better job matching</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Existing Resumes */}
              {resumes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-black mb-4">Your Resumes</h3>
                  <div className="space-y-3">
                    {resumes.map((resume) => (
                      <div key={resume.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <div>
                            <div className="font-medium text-black">{resume.file_name}</div>
                            <div className="text-sm text-gray-600">
                              {formatFileSize(resume.file_size)} • Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resume.processing_status)}`}>
                            {resume.processing_status}
                          </span>
                          <button
                            onClick={() => deleteResume(resume.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors"
                            title="Delete resume"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Resume */}
              <ResumeUpload onUploadComplete={loadResumes} />
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-black">Personal Information</h2>
                  <p className="text-gray-600">Update your profile details</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your first name"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <select
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select your country</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <select
                    id="experience_level"
                    value={formData.experience_level}
                    onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select experience level</option>
                    <option value="entry">Entry Level (0-2 years)</option>
                    <option value="mid">Mid Level (2-5 years)</option>
                    <option value="senior">Senior Level (5-10 years)</option>
                    <option value="lead">Lead/Principal (10+ years)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills
                </label>
                
                {/* Current Skills */}
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleSkillRemove(skill)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Custom Skill */}
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={handleNewSkillKeyPress}
                      placeholder="Add a custom skill..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleNewSkillAdd}
                      disabled={!newSkill.trim() || formData.skills.includes(newSkill.trim())}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Popular Skills */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Popular skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillAdd(skill)}
                        disabled={formData.skills.includes(skill)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          formData.skills.includes(skill)
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}