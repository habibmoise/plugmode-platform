import React from 'react';
import { CheckCircle, Circle, Plus } from 'lucide-react';

interface SkillsMatchIndicatorProps {
  userSkills: string[];
  requiredSkills: string[];
  className?: string;
  showAddSuggestion?: boolean;
  onSkillAdd?: (skill: string) => void;
}

export function SkillsMatchIndicator({ 
  userSkills, 
  requiredSkills, 
  className = '',
  showAddSuggestion = false,
  onSkillAdd
}: SkillsMatchIndicatorProps) {
  const normalizeSkill = (skill: string) => skill.toLowerCase().trim();
  
  const matchedSkills = requiredSkills.filter(reqSkill =>
    userSkills.some(userSkill => 
      normalizeSkill(userSkill).includes(normalizeSkill(reqSkill)) ||
      normalizeSkill(reqSkill).includes(normalizeSkill(userSkill))
    )
  );

  const missingSkills = requiredSkills.filter(reqSkill =>
    !userSkills.some(userSkill => 
      normalizeSkill(userSkill).includes(normalizeSkill(reqSkill)) ||
      normalizeSkill(reqSkill).includes(normalizeSkill(userSkill))
    )
  );

  const matchPercentage = requiredSkills.length > 0 
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 0;

  const getMatchColor = () => {
    if (matchPercentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (matchPercentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (matchPercentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getMatchLabel = () => {
    if (matchPercentage >= 80) return 'Excellent Match';
    if (matchPercentage >= 60) return 'Good Match';
    if (matchPercentage >= 40) return 'Partial Match';
    return 'Skills Gap';
  };

  if (requiredSkills.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Match Summary */}
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getMatchColor()}`}>
        <span>{matchPercentage}% skills match</span>
        <span className="text-xs">({matchedSkills.length}/{requiredSkills.length})</span>
      </div>

      {/* Detailed Skills Breakdown */}
      <div className="mt-3 space-y-2">
        {/* Matched Skills */}
        {matchedSkills.length > 0 && (
          <div>
            <div className="text-xs font-medium text-green-700 mb-1">✓ You have these skills:</div>
            <div className="flex flex-wrap gap-1">
              {matchedSkills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                >
                  <CheckCircle className="h-3 w-3" />
                  <span>{skill}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {missingSkills.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">
              {showAddSuggestion ? '+ Consider adding:' : 'Missing skills:'}
            </div>
            <div className="flex flex-wrap gap-1">
              {missingSkills.slice(0, showAddSuggestion ? 3 : missingSkills.length).map((skill, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs border ${
                    showAddSuggestion 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100' 
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                  onClick={() => showAddSuggestion && onSkillAdd && onSkillAdd(skill)}
                >
                  {showAddSuggestion ? (
                    <Plus className="h-3 w-3" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                  <span>{skill}</span>
                </span>
              ))}
            </div>
            
            {showAddSuggestion && missingSkills.length > 3 && (
              <div className="text-xs text-gray-500 mt-1">
                +{missingSkills.length - 3} more skills could improve your match
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match Quality Indicator */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Skills Match Quality</span>
          <span>{getMatchLabel()}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              matchPercentage >= 80 ? 'bg-green-500' :
              matchPercentage >= 60 ? 'bg-blue-500' :
              matchPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${matchPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}