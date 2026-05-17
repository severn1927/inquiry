export function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatOnlyDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export function getIStatusLabel(iStatus: string) {
  const map: Record<string, string> = {
    '建立联系': '建立联系',
    '待沟通': '待沟通',
    '放弃': '放弃',
    '成交(含寄样）': '成交(含寄样）',
  }
  return map[iStatus] || iStatus || '-'
}

export function getIStatusBadgeClass(iStatus: string) {
  const map: Record<string, string> = {
    '建立联系': 'bg-blue-50 text-blue-700 border border-blue-200',
    '待沟通': 'bg-amber-50 text-amber-700 border border-amber-200',
    '放弃': 'bg-slate-100 text-slate-500 border border-slate-200',
    '成交(含寄样）': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  }
  return map[iStatus] || 'bg-slate-50 text-slate-600'
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
