import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { InquiryListPage } from '@/pages/InquiryListPage'
import { NewInquiryPage } from '@/pages/NewInquiryPage'
import { InquiryDetailPage } from '@/pages/InquiryDetailPage'
import { UserManagementPage } from '@/pages/UserManagementPage'
import { DictManagementPage } from '@/pages/DictManagementPage'
import { SalesManagementPage } from '@/pages/SalesManagementPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { useAuthStore } from '@/stores/auth'

function ProtectedRoutes() {
  const { fetchUser } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inquiries" element={<InquiryListPage />} />
        <Route path="/inquiries/new" element={<NewInquiryPage />} />
        <Route path="/inquiries/:id" element={<InquiryDetailPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/sales" element={<SalesManagementPage />} />
        <Route path="/dicts" element={<DictManagementPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
