import GoogleSignupButton from '../components/GoogleSignupButton';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Globe, Target, Users, Quote, Plus, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

// Export countries list for use in other components
export const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Brazzaville)", "Congo (Kinshasa)",
  "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Validation states
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const careerGoals = [
    'Get first international remote job',
    'Advance my remote career',
    'Explore new industries',
    'Find part-time remote work',
    'Build a global network',
    'Transition to tech career',
    'Increase my salary',
    'Work with international teams'
  ];

  const experienceLevels = [
    { value: 'entry', label: 'Entry Level (0-2 years)' },
    { value: 'mid', label: 'Mid Level (2-5 years)' },
    { value: 'senior', label: 'Senior Level (5-10 years)' },
    { value: 'lead', label: 'Lead/Principal (10+ years)' }
  ];

  const popularSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'SQL',
    'HTML/CSS', 'Git', 'AWS', 'Docker', 'UI/UX Design', 'Figma',
    'Digital Marketing', 'SEO', 'Content Writing', 'Project Management',
    'Data Analysis', 'Excel', 'Communication', 'Leadership'
  ];

  // Validation functions
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // First Name validation
    if (!firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last Name validation  
    if (!lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Location validation
    if (!location?.trim()) {
      newErrors.location = 'Location is required';
    }

    // Career Goal validation
    if (!careerGoal?.trim()) {
      newErrors.careerGoal = 'Career goal is required';
    }

    return newErrors;
  };

  const handleInputChange = (field: string, value: string) => {
    // Update the specific field
    switch (field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'location':
        setLocation(value);
        break;
      case 'careerGoal':
        setCareerGoal(value);
        break;
    }
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleInputBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate single field on blur
    const errors = validateForm();
    setFormErrors(prev => ({ ...prev, [field]: errors[field] || '' }));
  };

  const handleSkillAdd = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleNewSkillAdd = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = validateForm();
    setFormErrors(errors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      location: true,
      careerGoal: true
    });

    // Don't submit if there are validation errors
    if (Object.keys(errors).length > 0) {
      showToast({
        type: 'error',
        title: 'Form Validation Error',
        message: 'Please correct the highlighted fields before submitting.'
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, firstName, lastName, location, careerGoal, skills, experienceLevel);
      if (error) {
        showToast({
          type: 'error',
          title: 'Sign Up Failed',
          message: error.message
        });
      } else {
        showToast({
          type: 'success',
          title: 'Welcome to PlugMode!',
          message: 'Your account has been created successfully.'
        });
        navigate('/dashboard');
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Sign Up Error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {/* Floating elements for visual appeal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-30 animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-100 rounded-full blur-2xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-100 rounded-full blur-3xl opacity-20 animate-float"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center mb-8">
          <img 
            src="/no BG Logo angulaire de PLUGMODE-modified-Photoroom.png" 
            alt="PlugMode" 
            className="h-32 w-32"
          />
        </Link>
        
        <h2 className="text-center text-3xl font-bold text-black">
          Start your <span className="text-blue-600">global career</span>
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Join thousands of professionals finding remote opportunities worldwide
        </p>

        {/* Regional Social Proof */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-blue-600 font-semibold">Join 500+ professionals from Nigeria, Kenya, Indonesia building global careers</span>
          </div>
          
          {/* Success Story Quote */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-3">
              <Quote className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
              <div className="text-left">
                <p className="text-blue-800 italic">"Landed my dream job at a London startup - from Lagos!"</p>
                <p className="text-blue-600 font-medium mt-1">- Amara O.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-white/20">
          
          {/* Required fields notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Required fields are marked with</span> <span className="text-red-500">*</span>
            </p>
          </div>

          {/* Google Sign Up Button */}
          <div className="mb-6">
            <GoogleSignupButton disabled={loading} />

            {/* Divider */}
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/80 text-gray-500">Or sign up with email</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  onBlur={() => handleInputBlur('firstName')}
                  className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                    formErrors.firstName && touched.firstName
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your first name"
                  disabled={loading}
                />
                {formErrors.firstName && touched.firstName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  onBlur={() => handleInputBlur('lastName')}
                  className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                    formErrors.lastName && touched.lastName
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your last name"
                  disabled={loading}
                />
                {formErrors.lastName && touched.lastName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleInputBlur('email')}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                  formErrors.email && touched.email
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Enter your email address"
                disabled={loading}
              />
              {formErrors.email && touched.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleInputBlur('password')}
                  className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors pr-10 ${
                    formErrors.password && touched.password
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Create a secure password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && touched.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.password}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 6 characters long
              </p>
            </div>

            {/* Location Selector */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>Where are you based? <span className="text-red-500">*</span></span>
                </div>
              </label>
              <select
                id="location"
                value={location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                onBlur={() => handleInputBlur('location')}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                  formErrors.location && touched.location
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={loading}
              >
                <option value="">Select your country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              {formErrors.location && touched.location && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.location}
                </p>
              )}
            </div>

            {/* Career Goal Selector */}
            <div>
              <label htmlFor="careerGoal" className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span>What's your career goal? <span className="text-red-500">*</span></span>
                </div>
              </label>
              <select
                id="careerGoal"
                value={careerGoal}
                onChange={(e) => handleInputChange('careerGoal', e.target.value)}
                onBlur={() => handleInputBlur('careerGoal')}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                  formErrors.careerGoal && touched.careerGoal
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={loading}
              >
                <option value="">Select your goal</option>
                {careerGoals.map((goal) => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
              {formErrors.careerGoal && touched.careerGoal && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {formErrors.careerGoal}
                </p>
              )}
            </div>

            {/* Experience Level Selector */}
            <div>
              <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span>What's your experience level?</span>
                </div>
              </label>
              <select
                id="experienceLevel"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                disabled={loading}
              >
                <option value="">Select your experience level</option>
                {experienceLevels.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Skills Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Your key skills (optional)</span>
                </div>
              </label>
              
              {/* Current Skills */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleSkillRemove(skill)}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add Custom Skill */}
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={handleNewSkillKeyPress}
                  placeholder="Add a skill..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleNewSkillAdd}
                  disabled={!newSkill.trim() || skills.includes(newSkill.trim()) || loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
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
                      disabled={skills.includes(skill) || loading}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        skills.includes(skill)
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

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">What you get:</span>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className="flex items-center space-x-2">
                  <Globe className="h-3 w-3" />
                  <span>Access to global remote opportunities</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Target className="h-3 w-3" />
                  <span>AI-powered job matching</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Users className="h-3 w-3" />
                  <span>Community of professionals</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3" />
                  <span>Career guidance and support</span>
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || Object.keys(validateForm()).length > 0}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 ${
                loading || Object.keys(validateForm()).length > 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}