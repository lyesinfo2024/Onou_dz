export type UserRole = 'SUPER_ADMIN' | 'DIRECTOR' | 'DEPARTMENT_HEAD';

export interface Directorate {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  subscription_status?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  subscription_start_date?: string;
  subscription_end_date?: string;
  subscription_plan?: string;
  subscription_id?: number;
  departments_count?: number;
  users_count?: number;
  director_name?: string | null;
  director_username?: string | null;
  director_email?: string | null;
}

export interface Subscription {
  id: number;
  directorate_id: number;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  plan_name: string;
  start_date: string;
  end_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  directorate_name?: string;
  directorate_code?: string;
}

export interface UserSubscriptionInfo {
  status: string;
  end_date: string;
  is_expired: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  roleName: string;
  directorateId?: number | null;
  directorateName?: string;
  directorateCode?: string;
  departmentId: number | null;
  departmentName?: string;
  departmentCode?: string;
  departmentDescription?: string;
  phone?: string | null;
  lastLogin?: string | null;
  is_active?: number;
  isActive?: boolean;
  permissions: string[];
  scope: string;
  subscription?: UserSubscriptionInfo | null;
}

export interface Department {
  id: number;
  directorate_id?: number;
  directorate_name?: string;
  directorate_code?: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  is_active?: number;
  created_at: string;
  head_name?: string;
  head_email?: string;
  head_phone?: string;
  head_username?: string;
  head_id?: number;
}

export interface DemoAccount {
  role: UserRole;
  roleLabel: string;
  name: string;
  identifier: string;
  password?: string;
  department: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'REVIEWED';

export interface ReportAttachment {
  id: number;
  report_id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by: number;
  created_at: string;
  uploader_name?: string;
}

export interface Report {
  id: number;
  directorate_id?: number;
  directorate_name?: string;
  department_id: number;
  created_by: number;
  report_type: ReportType;
  title: string;
  report_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  content: string;
  status: ReportStatus;
  revision_notes?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  dept_name?: string;
  dept_code?: string;
  author_name?: string;
  author_email?: string;
  attachments_count?: number;
  attachments?: ReportAttachment[];
}

export interface ReportsStats {
  total: number;
  drafts: number;
  submitted: number;
  under_review: number;
  needs_revision: number;
  reviewed: number;
  daily: number;
  weekly: number;
  monthly: number;
}

export type DirectiveTargetType = 'DEPARTMENT' | 'ALL';
export type DirectivePriority = 'NORMAL' | 'HIGH' | 'URGENT';
export type DirectiveStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'RETURNED';

export interface DirectiveDepartmentStatus {
  id: number;
  directive_id: number;
  department_id: number;
  status: DirectiveStatus;
  acknowledged_by?: number | null;
  acknowledged_at?: string | null;
  acknowledged_by_name?: string | null;
  started_by?: number | null;
  started_at?: string | null;
  started_by_name?: string | null;
  completed_by?: number | null;
  completed_at?: string | null;
  completed_by_name?: string | null;
  returned_by?: number | null;
  returned_at?: string | null;
  returned_by_name?: string | null;
  return_notes?: string | null;
  created_at: string;
  updated_at: string;
  dept_name?: string;
  dept_code?: string;
  dept_icon?: string;
}

export interface DirectiveDepartmentsSummary {
  total: number;
  new_count: number;
  acknowledged: number;
  in_progress: number;
  completed: number;
  returned: number;
}

export interface Directive {
  id: number;
  directorate_id?: number;
  directorate_name?: string;
  title: string;
  content: string;
  target_type: DirectiveTargetType;
  target_department_id: number | null;
  created_by: number;
  priority: DirectivePriority;
  status: DirectiveStatus;
  due_date?: string | null;
  acknowledged_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  returned_at?: string | null;
  return_notes?: string | null;
  created_at: string;
  updated_at: string;
  target_dept_name?: string;
  target_dept_code?: string;
  creator_name?: string;
  creator_email?: string;
  my_status?: DirectiveDepartmentStatus | null;
  departments_status?: DirectiveDepartmentStatus[];
  departments_summary?: DirectiveDepartmentsSummary;
}

export interface DirectivesStats {
  total: number;
  new_count: number;
  acknowledged: number;
  in_progress: number;
  completed: number;
  returned: number;
  urgent: number;
}

