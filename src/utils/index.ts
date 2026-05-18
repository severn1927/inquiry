export function formatDate(dateStr: string) {
  if (!dateStr) return ''
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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 大洲 → 大区映射
export const CONTINENT_TO_REGION: Record<string, string> = {
  '亚洲': '亚太',
  '大洋洲': '亚太',
  '非洲': '欧非',
  '欧洲': '欧非',
  '中东': '欧非',
  '北美': '美洲',
  '南美': '美洲',
  '中南美': '美洲',
}

// 标准化大洲名（处理AI返回的变体）
export function normalizeContinent(name: string): string {
  if (!name) return name
  const map: Record<string, string> = {
    '北美洲': '北美洲',
    '北美': '北美洲',
    '南美洲': '南美洲',
    '南美': '南美洲',
    '欧洲': '欧洲',
    '非洲': '非洲',
    '亚洲': '亚洲',
    '大洋洲': '大洋洲',
    '中东': '中东',
    '北美洲 ': '北美洲',
    '南美洲 ': '南美洲',
  }
  const trimmed = name.trim()
  return map[trimmed] || trimmed
}

export function getContinentForRegion(region: string): string {
  const map: Record<string, string> = {
    '亚太': '亚洲',
    '欧非': '欧洲',
    '美洲': '北美洲',
  }
  return map[region] || ''
}
