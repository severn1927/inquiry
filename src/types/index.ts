export interface User {
  id: number
  username: string
  display_name: string
  role: 'admin' | 'user'
  channel_id: number
  is_active: boolean
  created_at: string
}

export interface Inquiry {
  id: number
  inquiry_no: string
  sales_person: string
  region: string
  customer_name: string
  company_name: string
  info_source: string
  channel: string
  contact: string
  email: string
  other_contact: string
  continent: string
  country: string
  visitor_need: string
  visitor_need_cn: string
  product_category: string
  inquiry_role: string
  fleet_size: string
  is_star: boolean
  status: 'pending' | 'approved' | 'rejected'
  is_spam: boolean
  i_status: string
  is_use: number
  inquiry_date: string
  raw_text: string
  raw_image_path: string
  created_at: string
  updated_at: string
}

export interface InquiryCreate {
  sales_person: string
  region: string
  customer_name: string
  company_name: string
  info_source: string
  channel: string
  contact: string
  email: string
  other_contact: string
  continent: string
  country: string
  visitor_need: string
  visitor_need_cn: string
  product_category: string
  inquiry_role: string
  fleet_size: string
  is_star: boolean
  status: string
  is_spam: boolean
  i_status: string
  is_use: number
  inquiry_date: string
  raw_text: string
}

export interface InquiryUpdate {
  sales_person?: string
  region?: string
  customer_name?: string
  company_name?: string
  info_source?: string
  channel?: string
  contact?: string
  email?: string
  other_contact?: string
  continent?: string
  country?: string
  visitor_need?: string
  visitor_need_cn?: string
  product_category?: string
  inquiry_role?: string
  fleet_size?: string
  is_star?: boolean
  status?: string
  is_spam?: boolean
  i_status?: string
  is_use?: number
  inquiry_date?: string
}

export interface AIAnalysisResult {
  is_spam: boolean
  spam_reason: string
  extracted_data: Partial<InquiryCreate>
  detected_lang: string
}

export interface DashboardStats {
  total_inquiries: number
  valid_count: number
  invalid_count: number
  star_count: number
  this_month_count: number
  this_week_count: number
  recent_inquiries: Inquiry[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

// ===== Dict Types =====
export interface DictType {
  id: number
  name: string
  code: string
  sort_order: number
  created_at: string
}

export interface DictItem {
  id: number
  dict_type_id: number
  label: string
  value: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface DictOption {
  id: number
  label: string
  value: string
}

// ===== Sales Person =====
export interface SalesPerson {
  id: number
  name: string
  name_en: string
  email: string
  region: string
  weight: number
  sort_order: number
  is_active: boolean
  created_at: string
}

// ===== Schedule =====
export interface ScheduleRule {
  id: number
  region: string
  sales_person_id: number
  sales_person_name: string
  sort_order: number
  days_per_turn: number
  is_active: boolean
  created_at: string
}

export interface ScheduleDate {
  id: number
  region: string
  schedule_date: string
  sales_person_id: number
  sales_person_name: string
  is_manual: boolean
}

export interface AssignResult {
  sales_person: string
  name: string
  email?: string
  mode: string
}
