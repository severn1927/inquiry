import { Settings, Database, Key, Bell, Palette } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 text-sm mt-1">管理系统配置和偏好设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Config */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Key className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-800">AI 配置</h3>
              <p className="text-xs text-slate-400">DeepSeek API 设置</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">API URL</label>
              <input
                type="text"
                defaultValue="https://api.deepseek.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                disabled
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
              <input
                type="password"
                defaultValue="sk-****************************"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                disabled
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
              <input
                type="text"
                defaultValue="deepseek-chat"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                disabled
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">* AI 配置暂需通过后端 config.py 修改</p>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-800">系统信息</h3>
              <p className="text-xs text-slate-400">版本和数据库状态</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">系统版本</span>
              <span className="text-sm font-medium text-slate-700">V3.0.0 Web</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">数据库</span>
              <span className="text-sm font-medium text-emerald-600">SQLite (Normal)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">OCR 引擎</span>
              <span className="text-sm font-medium text-slate-700">Tesseract</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-500">AI 模型</span>
              <span className="text-sm font-medium text-slate-700">DeepSeek Chat</span>
            </div>
          </div>
        </div>

        {/* Notifications Placeholder */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-800">通知设置</h3>
              <p className="text-xs text-slate-400">邮件通知和提醒配置</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 py-8 text-center">功能开发中，敬请期待...</p>
        </div>

        {/* Appearance Placeholder */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
              <Palette className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-800">外观设置</h3>
              <p className="text-xs text-slate-400">主题和显示偏好</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 py-8 text-center">功能开发中，敬请期待...</p>
        </div>
      </div>
    </div>
  )
}
