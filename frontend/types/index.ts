// Shared Types - VoiceED
// Common TypeScript interfaces used across services and components

// Auth Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
  gender?: 'female' | 'male' | 'lgbtq+';
  birthday?: {
    month: string;
    day: string;
    year: string;
  };
  termsAccepted: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  gender?: string;
  birthday?: string;
  created_at: string;
}

// Report Types (ReportED)
export interface Report {
  id: string;
  title: string;
  description: string;
  category: 'academic' | 'harassment' | 'safety' | 'discrimination' | 'mental-health' | 'violence' | 'other';
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  is_anonymous: boolean;
  location?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateReportData {
  title: string;
  description: string;
  category: Report['category'];
  is_anonymous?: boolean;
  location?: string;
}

export interface UpdateReportData {
  title?: string;
  description?: string;
  status?: Report['status'];
  category?: Report['category'];
}

// Wellness Types (WellnessED)
export interface WellnessTip {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateJournalEntryData {
  title: string;
  content: string;
  mood?: string;
}

// Inspire Types (InspireED)
export interface InspireStory {
  id: string;
  title: string;
  content: string;
  author_name?: string;
  is_anonymous: boolean;
  user_id?: string;
  created_at: string;
}

export interface InspireQuote {
  id: string;
  quote: string;
  author?: string;
  created_at: string;
}

export interface CreateStoryData {
  title: string;
  content: string;
  author_name?: string;
  is_anonymous?: boolean;
}

export interface CreateQuoteData {
  quote: string;
  author?: string;
}

// Share Types (ShareED)
export interface SharedMaterial {
  id: string;
  title: string;
  description?: string;
  subject: string;
  file_url: string;
  file_type: string;
  user_id: string;
  download_count: number;
  created_at: string;
}

export interface CreateMaterialData {
  title: string;
  description?: string;
  subject: string;
  file_url: string;
  file_type: string;
  is_anonymous?: boolean;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'student' | 'admin' | 'moderator';
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

// API Response Wrappers
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// Component Prop Types (for future data-driven components)
export interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    description: string;
    location?: string;
  };
}

export interface PostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    author: string;
    created_at: string;
    likes: number;
  };
}

export interface GalleryItemProps {
  item: {
    id: string;
    image_url: string;
    title: string;
    description?: string;
  };
}

export interface ReportCardProps {
  report: Report;
  onClick?: (report: Report) => void;
}

export interface WellnessCardProps {
  tip: WellnessTip;
  onClick?: (tip: WellnessTip) => void;
}

export interface StoryCardProps {
  story: InspireStory;
  onClick?: (story: InspireStory) => void;
}

export interface MaterialCardProps {
  material: SharedMaterial;
  onDownload?: (material: SharedMaterial) => void;
  onPreview?: (material: SharedMaterial) => void;
}

export interface UserCardProps {
  user: User;
  onClick?: (user: User) => void;
}

// Form Props
export interface LoginFormProps {
  onSubmit: (data: LoginCredentials) => Promise<void>;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  isLoading?: boolean;
}

export interface RegisterFormProps {
  onSubmit: (data: RegisterData) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
}

export interface ReportFormProps {
  onSubmit: (data: CreateReportData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface JournalFormProps {
  onSubmit: (data: CreateJournalEntryData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateJournalEntryData>;
  isLoading?: boolean;
}

export interface MaterialUploadFormProps {
  onSubmit: (data: CreateMaterialData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ProfileFormProps {
  onSubmit: (data: UpdateUserData) => Promise<void>;
  onCancel: () => void;
  initialData: User;
  isLoading?: boolean;
}

// Modal Props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}