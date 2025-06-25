/*
  # Insert Sample Jobs for PlugMode

  1. Sample Data
    - Insert 20 sample remote jobs welcoming applications from underserved regions
    - Include various categories: Engineering, Design, Management, Other
    - All jobs emphasize remote work and global accessibility
    - Salary ranges appropriate for global remote positions

  2. Job Categories
    - Engineering (8 jobs)
    - Design (2 jobs) 
    - Management (3 jobs)
    - Other (7 jobs)
*/

-- Insert sample jobs
INSERT INTO jobs (title, company, description, location, salary, category, source_url) VALUES
-- Engineering Jobs
('Senior React Developer', 'TechGlobal', 'Join our global team building next-generation web applications. We welcome talented developers from Africa, Asia, and Latin America. Full remote position with flexible hours.', 'Remote (Africa Welcome)', '$50-70k', 'Engineering', 'https://techglobal.com/careers'),

('Python Developer', 'DataCorp', 'Work with cutting-edge data processing systems. Visa sponsorship available for exceptional candidates. Remote-first company with global presence.', 'Remote (Visa Sponsorship)', '$45-65k', 'Engineering', 'https://datacorp.com/jobs'),

('Frontend Developer', 'WebCorp', 'Create beautiful user interfaces for millions of users worldwide. We actively recruit from underrepresented regions and provide mentorship.', 'Fully Remote', '$35-55k', 'Engineering', 'https://webcorp.com/careers'),

('DevOps Engineer', 'CloudTech', 'Build and maintain cloud infrastructure for global applications. Experience with AWS/GCP preferred. Remote team across 15 countries.', 'Remote Worldwide', '$55-75k', 'Engineering', 'https://cloudtech.com/jobs'),

('Full Stack Developer', 'AppCorp', 'End-to-end development of modern web applications. We value diverse perspectives and welcome applications from all regions.', 'Remote Global', '$45-70k', 'Engineering', 'https://appcorp.com/careers'),

('Backend Developer', 'ServerCorp', 'Design scalable backend systems for high-traffic applications. Strong focus on work-life balance and global team collaboration.', 'Remote (Global)', '$50-70k', 'Engineering', 'https://servercorp.com/jobs'),

('Mobile Developer', 'AppStudio', 'Develop cross-platform mobile applications using React Native. Flexible hours to accommodate different time zones.', 'Remote Friendly', '$45-65k', 'Engineering', 'https://appstudio.com/careers'),

('QA Engineer', 'TestCorp', 'Ensure quality across our global platform. Entry-level friendly with comprehensive training program for new graduates.', 'Remote (Entry Level)', '$35-50k', 'Engineering', 'https://testcorp.com/jobs'),

-- Design Jobs
('UX Designer', 'StartupCorp', 'Design user experiences for our global marketplace. We especially encourage applications from designers in emerging markets.', 'Fully Remote', '$40-60k', 'Design', 'https://startupcorp.com/careers'),

('UI/UX Designer', 'DesignHub', 'Create intuitive interfaces for web and mobile applications. Remote-first culture with design team spanning 4 continents.', 'Remote Worldwide', '$40-60k', 'Design', 'https://designhub.com/jobs'),

-- Management Jobs
('Product Manager', 'InnovateCo', 'Lead product development for our global platform. Experience managing remote teams preferred. Open to candidates worldwide.', 'Global Remote', '$60-80k', 'Management', 'https://innovateco.com/careers'),

('Project Manager', 'ManageCorp', 'Coordinate projects across international teams. PMP certification preferred but not required. Excellent growth opportunities.', 'Remote (Global)', '$50-70k', 'Management', 'https://managecorp.com/jobs'),

('Customer Success Manager', 'ClientCorp', 'Build relationships with our global customer base. Multilingual candidates especially welcome. Flexible schedule.', 'Remote Flexible', '$40-55k', 'Management', 'https://clientcorp.com/careers'),

-- Other Jobs
('Data Scientist', 'AnalyticsCorp', 'Analyze data to drive business insights. PhD preferred but exceptional candidates with strong portfolios welcome from any background.', 'Remote (PhD Preferred)', '$60-85k', 'Other', 'https://analyticscorp.com/jobs'),

('Technical Writer', 'DocsCorp', 'Create documentation for developer tools. Native or near-native English required. Great entry point for technical writing career.', 'Remote (English)', '$30-45k', 'Other', 'https://docscorp.com/careers'),

('WordPress Developer', 'CMSCorp', 'Develop custom WordPress solutions for enterprise clients. Perfect for developers looking to specialize in WordPress ecosystem.', 'Remote WordPress', '$30-50k', 'Other', 'https://cmscorp.com/jobs'),

('Marketing Manager', 'GrowthCorp', 'Drive marketing initiatives for global SaaS platform. Experience with international markets highly valued.', 'Remote Marketing', '$40-60k', 'Other', 'https://growthcorp.com/careers'),

('Sales Developer', 'SalesTech', 'Generate leads and qualify prospects for our sales team. Excellent communication skills required. Commission opportunities.', 'Remote Sales', '$35-55k', 'Other', 'https://salestech.com/jobs'),

('Content Creator', 'MediaCorp', 'Create engaging content for our global audience. Video editing and social media experience preferred. Creative freedom encouraged.', 'Remote Creative', '$25-40k', 'Other', 'https://mediacorp.com/careers'),

('React Native Developer', 'MobileTech', 'Build mobile applications for iOS and Android. Cross-platform development experience required. Global team collaboration.', 'Remote Mobile', '$45-65k', 'Other', 'https://mobiletech.com/jobs');