import { useState, useEffect, useCallback } from 'react'
import { settingsApi } from '@/services/api'

/**
 * 共享的字典数据 Hook
 * 提供按 category 获取字典项列表的能力
 * 用于替换各页面中硬编码的 select 下拉选项
 */
const dictCache: Record<string, string[]> = {}
const listeners: Set<() => void> = new Set()

function notifyListeners() {
  listeners.forEach(fn => fn())
}

export function useDict(category: string): string[] {
  const [items, setItems] = useState<string[]>(dictCache[category] || [])

  const fetch = useCallback(() => {
    settingsApi.getDictItems(category).then(res => {
      const names = res.data.map(item => item.name)
      dictCache[category] = names
      setItems(names)
    }).catch(() => {})
  }, [category])

  useEffect(() => {
    fetch()
    listeners.add(fetch)
    return () => { listeners.delete(fetch) }
  }, [fetch])

  return items
}

/**
 * 获取多个分类的字典数据
 */
export function useDicts(categories: string[]): Record<string, string[]> {
  const [data, setData] = useState<Record<string, string[]>>({})

  useEffect(() => {
    let mounted = true
    const results: Record<string, string[]> = {}
    let loaded = 0

    categories.forEach(cat => {
      if (dictCache[cat]) {
        results[cat] = dictCache[cat]
        loaded++
        if (loaded === categories.length && mounted) setData({ ...results })
      } else {
        settingsApi.getDictItems(cat).then(res => {
          if (!mounted) return
          const names = res.data.map(item => item.name)
          dictCache[cat] = names
          results[cat] = names
          loaded++
          if (loaded === categories.length) setData({ ...results })
        }).catch(() => {
          loaded++
          if (loaded === categories.length && mounted) setData({ ...results })
        })
      }
    })

    return () => { mounted = false }
  }, [categories.join(',')])

  return data
}

/**
 * 强制刷新所有字典缓存（新增/删除字典项后调用）
 */
export function refreshDictCache() {
  Object.keys(dictCache).forEach(k => delete dictCache[k])
  notifyListeners()
}
