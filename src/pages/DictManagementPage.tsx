import { useEffect, useState, useCallback } from 'react'
import { dictApi } from '@/services/api'
import type { DictType, DictItem } from '@/types'
import { BookOpen, Plus, Trash2, Edit2, X, ToggleLeft, ToggleRight, Database, LayoutGrid, Link } from 'lucide-react'

// 字典类型对应图标
function getTypeIcon(code: string) {
  switch (code) {
    case 'channel':
      return <Link className="w-4 h-4" />
    case 'region':
      return <LayoutGrid className="w-4 h-4" />
    case 'continent':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'product_category':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    default:
      return <LayoutGrid className="w-4 h-4" />
  }
}

export function DictManagementPage() {
  const [types, setTypes] = useState<DictType[]>([])
  const [itemsMap, setItemsMap] = useState<Record<number, DictItem[]>>({})
  const [expandedType, setExpandedType] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // 字典类型表单
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [editingType, setEditingType] = useState<DictType | null>(null)
  const [typeForm, setTypeForm] = useState({ name: '', code: '', sort_order: 0 })

  // 字典项表单
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DictItem | null>(null)
  const [itemForm, setItemForm] = useState({ label: '', value: '', sort_order: 0 })

  const fetchTypes = useCallback(() => {
    setLoading(true)
    dictApi.getTypes().then(res => {
      setTypes(res.data)
      res.data.forEach(t => fetchItems(t.id))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const fetchItems = (typeId: number) => {
    dictApi.getItems(typeId).then(res => {
      setItemsMap(prev => ({ ...prev, [typeId]: res.data }))
    })
  }

  useEffect(() => { fetchTypes() }, [fetchTypes])

  // ========== 字典类型操作 ==========
  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault()
    await dictApi.createType(typeForm)
    setShowTypeForm(false)
    setTypeForm({ name: '', code: '', sort_order: 0 })
    fetchTypes()
  }

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingType) return
    await dictApi.updateType(editingType.id, typeForm)
    setShowTypeForm(false)
    setEditingType(null)
    setTypeForm({ name: '', code: '', sort_order: 0 })
    fetchTypes()
  }

  const handleEditType = (t: DictType) => {
    setEditingType(t)
    setTypeForm({ name: t.name, code: t.code, sort_order: t.sort_order })
    setShowTypeForm(true)
  }

  const handleDeleteType = async (id: number) => {
    if (!confirm('确定删除该字典类型及其下所有字典项？此操作不可撤销。')) return
    await dictApi.deleteType(id)
    setItemsMap(prev => { const m = { ...prev }; delete m[id]; return m })
    fetchTypes()
  }

  // ========== 字典项操作 ==========
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (expandedType === null) return
    await dictApi.createItem(expandedType, itemForm)
    setShowItemForm(false)
    setItemForm({ label: '', value: '', sort_order: 0 })
    fetchItems(expandedType)
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    await dictApi.updateItem(editingItem.id, itemForm)
    setShowItemForm(false)
    setEditingItem(null)
    setItemForm({ label: '', value: '', sort_order: 0 })
    if (expandedType !== null) fetchItems(expandedType)
  }

  const handleEditItem = (item: DictItem) => {
    setEditingItem(item)
    setItemForm({ label: item.label, value: item.value, sort_order: item.sort_order })
    setShowItemForm(true)
  }

  const handleDeleteItem = async (id: number) => {
    if (!confirm('确定删除该字典项？')) return
    await dictApi.deleteItem(id)
    if (expandedType !== null) fetchItems(expandedType)
  }

  const handleToggleItem = async (item: DictItem) => {
    await dictApi.updateItem(item.id, { is_active: !item.is_active })
    if (expandedType !== null) fetchItems(expandedType)
  }

  const handleInitData = async () => {
    await dictApi.initData()
    fetchTypes()
  }

  const toggleExpand = (typeId: number) => {
    setExpandedType(expandedType === typeId ? null : typeId)
    setShowItemForm(false)
    setEditingItem(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-800">字典管理</h1>
            <p className="text-slate-400 text-xs mt-0.5">管理系统字典数据，用于询盘字段的下拉选项配置</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {types.length === 0 && (
            <button
              onClick={handleInitData}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md shadow-amber-500/20"
            >
              <Database className="w-4 h-4" />
              初始化默认数据
            </button>
          )}
          <button
            onClick={() => { setShowTypeForm(true); setEditingType(null); setTypeForm({ name: '', code: '', sort_order: types.length + 1 }) }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all shadow-md shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            新增字典类型
          </button>
        </div>
      </div>

      {/* 字典类型表单 Modal */}
      {showTypeForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingType ? 'bg-blue-50 text-blue-500' : 'bg-primary-50 text-primary-500'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-800">{editingType ? '编辑字典类型' : '新增字典类型'}</h3>
              </div>
              <button onClick={() => setShowTypeForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={editingType ? handleUpdateType : handleCreateType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">类型名称 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="如：渠道、大区、大洲"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">类型编码 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={typeForm.code}
                  onChange={e => setTypeForm({ ...typeForm, code: e.target.value })}
                  placeholder="如：channel、region、continent"
                  required
                  disabled={!!editingType}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all disabled:opacity-50 placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">排序</label>
                <input
                  type="number"
                  value={typeForm.sort_order}
                  onChange={e => setTypeForm({ ...typeForm, sort_order: Number(e.target.value) })}
                  min={0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowTypeForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                  取消
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm hover:from-primary-600 hover:to-accent-600 transition-all font-medium shadow-sm">
                  {editingType ? '保存修改' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 字典项表单 Modal */}
      {showItemForm && expandedType !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingItem ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  {editingItem ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-800">{editingItem ? '编辑字典项' : '新增字典项'}</h3>
              </div>
              <button onClick={() => setShowItemForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={editingItem ? handleUpdateItem : handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">显示名称 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={itemForm.label}
                  onChange={e => setItemForm({ ...itemForm, label: e.target.value })}
                  placeholder="如：英文官网、美洲、4线设备"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">值 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={itemForm.value}
                  onChange={e => setItemForm({ ...itemForm, value: e.target.value })}
                  placeholder="存储值"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">排序</label>
                <input
                  type="number"
                  value={itemForm.sort_order}
                  onChange={e => setItemForm({ ...itemForm, sort_order: Number(e.target.value) })}
                  min={0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                  取消
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl text-sm hover:from-primary-600 hover:to-accent-600 transition-all font-medium shadow-sm">
                  {editingItem ? '保存修改' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 字典列表 */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium mb-1">暂无字典数据</p>
          <p className="text-slate-400 text-sm mb-5">点击下方按钮初始化系统预设的字典数据</p>
          <button
            onClick={handleInitData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all shadow-md shadow-primary-500/20"
          >
            <Database className="w-4 h-4" />
            初始化默认字典数据
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {types.map(dt => {
            const isExpanded = expandedType === dt.id
            const items = itemsMap[dt.id] || []
            const activeCount = items.filter(i => i.is_active).length
            const inactiveCount = items.length - activeCount

            return (
              <div
                key={dt.id}
                className={`bg-white rounded-2xl border transition-all duration-200 ${
                  isExpanded
                    ? 'border-primary-200 shadow-lg shadow-primary-500/5 ring-1 ring-primary-100'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
                } overflow-hidden`}
              >
                {/* 类型标题卡片 */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer select-none transition-colors"
                  onClick={() => toggleExpand(dt.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isExpanded ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md shadow-primary-500/20' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {getTypeIcon(dt.code)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{dt.name}</span>
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] rounded-md font-mono tracking-wide">{dt.code}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{items.length} 项</span>
                        {inactiveCount > 0 && (
                          <span className="text-xs text-amber-500">{inactiveCount} 项已禁用</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditType(dt)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-primary-500"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteType(dt.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ml-1 ${
                      isExpanded ? 'bg-primary-50 text-primary-500 rotate-180' : 'text-slate-300'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 字典项列表 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    {/* 工具栏 */}
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">字典项列表</span>
                      <button
                        onClick={() => { setShowItemForm(true); setEditingItem(null); setItemForm({ label: '', value: '', sort_order: items.length + 1 }) }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-primary-600 text-xs font-medium rounded-lg hover:bg-primary-50 transition-colors border border-primary-100 shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        添加
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <p className="text-sm text-slate-400">暂无字典项</p>
                      </div>
                    ) : (
                      <div className="px-5 pb-4">
                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                          {items.map((item, idx) => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between px-4 py-3 transition-colors group ${
                                idx < items.length - 1 ? 'border-b border-slate-50' : ''
                              } ${!item.is_active ? 'opacity-50' : 'hover:bg-slate-50/50'}`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-400 shrink-0">
                                  {item.sort_order || idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700 truncate">{item.label}</span>
                                    {item.label !== item.value && (
                                      <span className="text-[11px] text-slate-400 font-mono truncate hidden sm:inline">{item.value}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button
                                  onClick={() => handleToggleItem(item)}
                                  className="p-1.5 rounded-lg transition-colors"
                                  title={item.is_active ? '点击禁用' : '点击启用'}
                                >
                                  {item.is_active ? (
                                    <ToggleRight className="w-5 h-5 text-emerald-500" />
                                  ) : (
                                    <ToggleLeft className="w-5 h-5 text-slate-300" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="p-1.5 rounded-lg hover:bg-primary-50 transition-colors text-slate-300 hover:text-primary-500 opacity-0 group-hover:opacity-100"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
