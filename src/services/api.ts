import axios from 'axios'
import type {
  Inquiry, InquiryCreate, InquiryUpdate, AIAnalysisResult,
  DashboardStats, PaginatedResponse, LoginResponse, User,
  StaffItem, StaffDutyConfig, ScheduleItem, ApiSettings,
  AnalyticsOverview, AnalyticsTrend,
  DictItem, CountryStaff, AssignRules,
} from '@/types'

const api = axios.create({
  baseURL: 'https://api.css123.com/api',
  timeout: 30000,
})

// Token 拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截 — 只对非 login 的真实 401 响应跳转
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // 忽略网络错误、超时、非 401 的错误
    if (!error.response) {
      return Promise.reject(error)
    }
    // 401: 只有非 login 请求才跳转
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      if (!url.includes('/auth/login')) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ========== Auth ==========
export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),

  getMe: () =>
    api.get<User>('/auth/me'),

  getUsers: () =>
    api.get<User[]>('/auth/users'),

  createUser: (data: { username: string; password: string; display_name?: string; role?: string; channel?: string; info_source?: string }) =>
    api.post('/auth/users', data),

  updateUser: (id: number, data: { display_name?: string; role?: string; channel?: string; info_source?: string; password?: string }) =>
    api.put(`/auth/users/${id}`, data),

  deleteUser: (id: number) =>
    api.delete(`/auth/users/${id}`),
}

// ========== Inquiries ==========
export const inquiryApi = {
  getList: (params?: {
    page?: number; page_size?: number; keyword?: string;
    region?: string; staff?: string; is_spam?: string;
    continent?: string; start_date?: string; end_date?: string;
  }) =>
    api.get<PaginatedResponse<Inquiry>>('/inquiries', { params }),

  getById: (id: number) =>
    api.get<Inquiry>(`/inquiries/${id}`),

  create: (data: InquiryCreate) =>
    api.post<Inquiry>('/inquiries', data),

  update: (id: number, data: InquiryUpdate) =>
    api.put<Inquiry>(`/inquiries/${id}`, data),

  delete: (id: number) =>
    api.delete(`/inquiries/${id}`),

  batchDelete: (ids: number[]) =>
    api.post('/inquiries/batch-delete', { ids }),
}

// ========== AI Analysis (long timeout) ==========
export const analyzeApi = {
  analyze: (data: { text?: string; image?: string | null }) =>
    api.post<AIAnalysisResult>('/analyze', data, { timeout: 120000 }),
}

// ========== Settings ==========
export const settingsApi = {
  getApiSettings: () =>
    api.get<ApiSettings>('/settings/api'),

  updateApiSettings: (data: Partial<ApiSettings>) =>
    api.put('/settings/api', data),

  getStaffDuty: () =>
    api.get<StaffDutyConfig>('/settings/staff-duty'),

  updateStaffDuty: (data: { staff?: StaffItem[]; duty?: { base_date: string; staff_order: string[]; days_per_person: number } }) =>
    api.put('/settings/staff-duty', data),

  // 分配规则
  getAssignRules: () =>
    api.get<AssignRules>('/settings/assign-rules'),

  updateAssignRules: (data: AssignRules) =>
    api.put('/settings/assign-rules', data),

  // 国家专属分配
  getCountryStaff: () =>
    api.get<CountryStaff[]>('/settings/country-staff'),

  addCountryStaff: (data: { country: string; staff_name: string; staff_email?: string }) =>
    api.post('/settings/country-staff', data),

  deleteCountryStaff: (country: string) =>
    api.delete(`/settings/country-staff/${encodeURIComponent(country)}`),

  // 字典表
  getDictItems: (category: string) =>
    api.get<DictItem[]>(`/settings/dict/${encodeURIComponent(category)}`),

  getDictCategories: () =>
    api.get<string[]>('/settings/dict'),

  addDictItem: (data: { category: string; name: string; sort_order?: number }) =>
    api.post('/settings/dict', data),

  updateDictItem: (id: number, data: { name?: string; sort_order?: number }) =>
    api.put(`/settings/dict/${id}`, data),

  deleteDictItem: (id: number) =>
    api.delete(`/settings/dict/${id}`),
}

// ========== Schedule ==========
export const scheduleApi = {
  getSchedule: (days?: number) =>
    api.get<ScheduleItem[]>('/schedule', { params: days ? { days } : {} }),

  getTodayDuty: () =>
    api.get('/schedule/today'),
}

// ========== Export (long timeout for blob) ==========
export const exportApi = {
  exportExcel: (ids?: number[]) =>
    api.post('/export/excel', { ids: ids || undefined }, { responseType: 'blob', timeout: 60000 }),
}

// ========== Dashboard Stats ==========
export const dashboardApi = {
  getStats: () =>
    api.get<DashboardStats>('/dashboard/stats'),

  getAnalyticsOverview: (params?: { start_date?: string; end_date?: string }) =>
    api.get<AnalyticsOverview>('/dashboard/analytics/overview', { params }),

  getAnalyticsTrend: (params?: { period?: string; start_date?: string; end_date?: string }) =>
    api.get<AnalyticsTrend>('/dashboard/analytics/trend', { params }),
}
