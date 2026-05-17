import axios from 'axios'
import type {
  Inquiry, InquiryCreate, InquiryUpdate, AIAnalysisResult,
  DashboardStats, PaginatedResponse, LoginResponse, User,
  DictType, DictItem, DictOption,
  SalesPerson, ScheduleRule, ScheduleDate, AssignResult,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 120000,
})

// Token 拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 响应拦截
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
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
}

// ========== Inquiries ==========
export const inquiryApi = {
  getList: (params?: { page?: number; page_size?: number; search?: string; status?: string; is_star?: boolean; is_spam?: boolean }) =>
    api.get<PaginatedResponse<Inquiry>>('/inquiries', { params }),

  getById: (id: number) =>
    api.get<Inquiry>(`/inquiries/${id}`),

  create: (data: InquiryCreate) =>
    api.post<Inquiry>('/inquiries', data),

  update: (id: number, data: InquiryUpdate) =>
    api.put<Inquiry>(`/inquiries/${id}`, data),

  delete: (id: number) =>
    api.delete(`/inquiries/${id}`),

  analyze: (text?: string, imageBase64?: string) =>
    api.post<AIAnalysisResult>('/inquiries/analyze', {
      text: text || undefined,
      image_base64: imageBase64 || undefined,
    }),

  getStats: () =>
    api.get<DashboardStats>('/inquiries/stats'),

  exportData: (params?: {
    ids?: string; continent?: string; region?: string; channel?: string;
    i_status?: string; is_use?: number; start_date?: string; end_date?: string;
  }) =>
    api.get<any[]>('/inquiries/export', { params }),

  getAnalyticsOverview: (params?: { start_date?: string; end_date?: string }) =>
    api.get<{
      total: number; valid: number; starred: number;
      by_channel: { name: string; count: number }[];
      by_region: { name: string; count: number }[];
      by_continent: { name: string; count: number }[];
      by_product: { name: string; count: number }[];
      by_sales_person: { name: string; count: number }[];
    }>('/inquiries/analytics/overview', { params }),

  getAnalyticsTrend: (params?: { period?: string; start_date?: string; end_date?: string }) =>
    api.get<{ period: string; data: { period: string; count: number }[] }>('/inquiries/analytics/trend', { params }),
}

// ========== Users ==========
export const userApi = {
  getList: () =>
    api.get<User[]>('/users'),

  create: (data: { username: string; password: string; display_name?: string; role?: string; channel_id?: number }) =>
    api.post<User>('/users', data),

  update: (id: number, data: { display_name?: string; password?: string; role?: string; channel_id?: number; is_active?: boolean }) =>
    api.put<User>(`/users/${id}`, data),

  delete: (id: number) =>
    api.delete(`/users/${id}`),
}

// ========== Dicts ==========
export const dictApi = {
  getTypes: () =>
    api.get<DictType[]>('/dicts/types'),

  createType: (data: { name: string; code: string; sort_order?: number }) =>
    api.post<DictType>('/dicts/types', data),

  updateType: (id: number, data: { name?: string; code?: string; sort_order?: number }) =>
    api.put<DictType>(`/dicts/types/${id}`, data),

  deleteType: (id: number) =>
    api.delete(`/dicts/types/${id}`),

  getItems: (typeId: number) =>
    api.get<DictItem[]>(`/dicts/types/${typeId}/items`),

  createItem: (typeId: number, data: { label: string; value: string; sort_order?: number }) =>
    api.post<DictItem>(`/dicts/types/${typeId}/items`, data),

  updateItem: (itemId: number, data: { label?: string; value?: string; sort_order?: number; is_active?: boolean }) =>
    api.put<DictItem>(`/dicts/items/${itemId}`, data),

  deleteItem: (itemId: number) =>
    api.delete(`/dicts/items/${itemId}`),

  getOptions: (code: string) =>
    api.get<DictOption[]>(`/dicts/public/${code}`),

  initData: () =>
    api.get('/dicts/init'),
}

// ========== Sales Persons ==========
export const salesApi = {
  getPersons: (region?: string) =>
    api.get<SalesPerson[]>('/sales/persons', { params: region ? { region } : {} }),

  createPerson: (data: { name: string; name_en?: string; email?: string; region: string; weight?: number; sort_order?: number }) =>
    api.post<SalesPerson>('/sales/persons', data),

  updatePerson: (id: number, data: { name?: string; name_en?: string; email?: string; region?: string; weight?: number; sort_order?: number; is_active?: boolean }) =>
    api.put<SalesPerson>(`/sales/persons/${id}`, data),

  deletePerson: (id: number) =>
    api.delete(`/sales/persons/${id}`),

  initPersons: () =>
    api.post('/sales/persons/init'),

  // 排班规则
  getScheduleRules: (region?: string) =>
    api.get<ScheduleRule[]>('/sales/schedule/rules', { params: region ? { region } : {} }),

  createScheduleRule: (region: string, data: { sales_person_id: number; sales_person_name: string; sort_order?: number; days_per_turn?: number }) =>
    api.post<ScheduleRule>(`/sales/schedule/rules?region=${encodeURIComponent(region)}`, data),

  updateScheduleRule: (id: number, data: { sales_person_id?: number; sales_person_name?: string; sort_order?: number; days_per_turn?: number; is_active?: boolean }) =>
    api.put<ScheduleRule>(`/sales/schedule/rules/${id}`, data),

  deleteScheduleRule: (id: number) =>
    api.delete(`/sales/schedule/rules/${id}`),

  // 排班日期
  generateSchedule: (data: { region: string; start_date?: string; end_date?: string; days_per_turn?: number }) =>
    api.post('/sales/schedule/generate', data),

  getScheduleDates: (region: string, startDate?: string, endDate?: string) =>
    api.get<ScheduleDate[]>('/sales/schedule/dates', { params: { region, start_date: startDate, end_date: endDate } }),

  updateScheduleDate: (id: number, salesPersonId: number, salesPersonName: string) =>
    api.put<ScheduleDate>(`/sales/schedule/dates/${id}?sales_person_id=${salesPersonId}&sales_person_name=${encodeURIComponent(salesPersonName)}`),

  clearScheduleDates: (region: string) =>
    api.delete('/sales/schedule/dates', { params: { region } }),

  // 分配
  assign: (region: string) =>
    api.post<AssignResult>('/sales/assign', { region }),

  // 今日值班
  getTodayDuty: () =>
    api.get<Record<string, { sales_person: string; mode: string }>>('/sales/today-duty'),
}
