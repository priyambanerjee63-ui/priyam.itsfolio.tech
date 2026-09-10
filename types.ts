export type AvailabilityStatus = 'available' | 'open_to_offers' | 'busy' | 'mentoring';

export type SkillCategory = 'Languages' | 'Frontend' | 'Backend & Cloud' | 'Databases' | 'DevOps & Tooling' | 'AI & Data';

export interface SkillItem {
  name: string;
  level?: 'Advanced' | 'Proficient' | 'Familiar';
}

export interface SkillGroup {
  category: SkillCategory;
  items: SkillItem[];
}

export interface ProjectItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: 'Full Stack' | 'Open Source' | 'AI / ML' | 'Dev Tools' | 'Mobile';
  tags: string[];
  demoUrl?: string;
  repoUrl?: string;
  stars?: number;
  featured: boolean;
  image?: string;
  metrics?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  description: string[];
  technologies: string[];
  current?: boolean;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  period: string;
  honors?: string;
}

export interface ArticleItem {
  id: string;
  title: string;
  publishedAt: string;
  readTime: string;
  platform: string;
  url: string;
  summary: string;
}

export interface MetricItem {
  label: string;
  value: string;
  icon?: string;
}

export interface DeveloperProfile {
  name: string;
  handle: string; // e.g. "alexchen" -> itsfolio.tech/@alexchen
  title: string;
  tagline: string;
  location: string;
  status: AvailabilityStatus;
  statusText: string;
  avatarUrl: string;
  yearsExperience: number;
  about: string;
  metrics: MetricItem[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
    blog?: string;
    resumeUrl?: string;
  };
  skills: SkillGroup[];
  projects: ProjectItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  articles: ArticleItem[];
  contactSettings: {
    allowDirectMessages: boolean;
    directEmail: string;
    calUrl?: string;
    preferredMethod: 'Email' | 'Cal.com' | 'LinkedIn' | 'Twitter';
  };
}

export type ThemeId = 'minimal-slate' | 'midnight-terminal' | 'cyber-aurora' | 'editorial-warm' | 'bento-clean';
export type FontStyle = 'sans' | 'mono' | 'editorial';
export type AccentColor = 'indigo' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'violet';

export interface PortfolioThemeConfig {
  themeId: ThemeId;
  fontStyle: FontStyle;
  accentColor: AccentColor;
  activeSections: {
    about: boolean;
    metrics: boolean;
    projects: boolean;
    skills: boolean;
    experience: boolean;
    articles: boolean;
    education: boolean;
    contact: boolean;
  };
  projectLayout: 'grid' | 'cards' | 'bento';
}

export interface HostingConfig {
  subdomain: string;
  customDomain?: string;
  isPublished: boolean;
  lastPublishedAt: string;
  viewsCount: number;
}

export interface FullPortfolioState {
  profile: DeveloperProfile;
  theme: PortfolioThemeConfig;
  hosting: HostingConfig;
}
