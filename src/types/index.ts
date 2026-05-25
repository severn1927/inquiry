// ===== 用户 =====
export interface User {
  id: number
  username: string
  display_name: string
  role: string  // 'admin' | '英文官网' | '阿里国际站' | '社媒'
  channel: string
  info_source: string
  created_at: string
  updated_at?: string
}

// ===== 询盘 =====
export interface Inquiry {
  id: number
  inquiry_no: string
  is_spam: number  // 0/1
  spam_reason: string
  staff: string
  staff_email: string
  region: string
  customer_name: string
  company_name: string
  info_source: string
  channel: string
  phone: string
  email: string
  other_contact: string
  order_no: string
  sale_order_no: string
  continent: string
  country: string
  visitor_need: string
  raw_need: string
  product_category: string
  email_subject: string
  sender: string
  remark: string
  inquiry_month: string
  inquiry_time: string
  created_at: string
  updated_at: string
}

export interface InquiryCreate {
  customer_name: string
  company_name: string
  email: string
  phone: string
  other_contact: string
  continent: string
  country: string
  region: string
  visitor_need: string
  raw_need: string
  product_category: string
  email_subject: string
  sender: string
  staff: string
  staff_email: string
  is_spam: boolean
  spam_reason: string
  remark: string
  inquiry_time: string
}

export interface InquiryUpdate {
  staff?: string
  staff_email?: string
  region?: string
  customer_name?: string
  company_name?: string
  phone?: string
  email?: string
  other_contact?: string
  continent?: string
  country?: string
  visitor_need?: string
  raw_need?: string
  product_category?: string
  remark?: string
  order_no?: string
  sale_order_no?: string
  email_subject?: string
  sender?: string
  is_spam?: boolean
  spam_reason?: string
  inquiry_time?: string
}

// ===== AI 分析结果 =====
export interface AIAnalysisResult {
  is_inquiry: boolean
  spam_reason: string
  extracted: {
    customer_name?: string
    company_name?: string
    email?: string
    phone?: string
    other_contact?: string
    country?: string
    continent?: string
    region?: string
    visitor_need?: string
    raw_need?: string
    product_category?: string
    info_source?: string
    channel?: string
    email_subject?: string
    sender?: string
    staff?: string
    staff_email?: string
    email_time?: string
  }
  ai_raw: Record<string, any>
  ocr_text: string
}

// ===== 仪表盘统计 =====
export interface DashboardStats {
  total_inquiries: number
  valid_count: number
  invalid_count: number
  spam_count: number
  this_month_count: number
  this_week_count: number
  recent_inquiries: Inquiry[]
}

// ===== 分页 =====
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ===== 登录 =====
export interface LoginResponse {
  token: string
  user: User
}

// ===== 业务员 =====
export interface StaffItem {
  name: string
  email: string
  weight: number
  region: string
}

export interface StaffDutyConfig {
  staff: StaffItem[]
  duty: {
    base_date: string
    staff_order: string[]
    days_per_person: number
  }
}

// ===== 排班 =====
export interface ScheduleItem {
  date: string
  weekday: string
  staff_name: string
  region: string
}

// ===== API 设置 =====
export interface ApiSettings {
  deepseek_api_key: string
  deepseek_api_url: string
  deepseek_model: string
  deepseek_max_tokens: number
  deepseek_temperature: number
}

// ===== 分析统计 =====
export interface AnalyticsOverview {
  total: number
  by_region: { name: string; count: number }[]
  by_continent: { name: string; count: number }[]
  by_product: { name: string; count: number }[]
  by_staff: { name: string; count: number }[]
  by_channel: { name: string; count: number }[]
}

export interface AnalyticsTrend {
  period: string
  data: { period: string; count: number }[]
}

// ===== 字典表 =====
export interface DictItem {
  id: number
  category: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

// ===== 国家专属分配 =====
export interface CountryStaff {
  country: string
  staff_name: string
  staff_email: string
}

// ===== 分配规则 =====
export interface ContinentOverrideItem {
  region: string        // 归属大区
  countries: string[]   // 属于该地区的国家列表
}

export interface AssignRules {
  schedule_regions: string[]
  continent_overrides: Record<string, ContinentOverrideItem>  // 地区名 -> {region, countries}
}
