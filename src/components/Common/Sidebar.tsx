import { useState, useMemo } from 'react'
import { Modal, Input, Select, message } from 'antd'
import { HomeOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTheme } from '../../contexts/ThemeContext'

type SubjectTab = 'search' | 'materials' | 'chat' | 'quiz' | 'review' | 'graph' | 'generate' | 'analysis'

interface SidebarProps {
  currentSubjectId: string | null
  subjects: Subject[]
  activeTab: SubjectTab | null
  onSelectOverview: () => void
  onSelectSubject: (id: string) => void
  onSelectTab: (tab: SubjectTab) => void
  onAddSubject: (name: string, color: string, year?: string) => void
  onDeleteSubject: (id: string) => void
}

const PRESET_COLORS = ['#1677ff', '#52c41a', '#722ed1', '#faad14', '#f5222d', '#13c2c2', '#eb2f96', '#fa8c16']

const YEAR_OPTIONS = [
  { value: '大一', label: '大一' },
  { value: '大二', label: '大二' },
  { value: '大三', label: '大三' },
  { value: '大四', label: '大四' },
  { value: '研究生', label: '研究生' },
]

const Sidebar = ({
  currentSubjectId,
  subjects,
  onSelectOverview,
  onSelectSubject,
  onDeleteSubject,
  onAddSubject,
}: SidebarProps) => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [newYear, setNewYear] = useState<string | undefined>(undefined)
  const { theme } = useTheme()

  const handleAdd = () => {
    if (!newName.trim()) {
      message.warning('请输入学科名称')
      return
    }
    onAddSubject(newName.trim(), newColor, newYear)
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    setNewYear(undefined)
    setShowAddModal(false)
  }

  const groupedSubjects = useMemo(() => {
    const groups: Record<string, Subject[]> = {}
    const ungrouped: Subject[] = []
    for (const s of subjects) {
      if (s.year) {
        if (!groups[s.year]) groups[s.year] = []
        groups[s.year].push(s)
      } else {
        ungrouped.push(s)
      }
    }
    const result: { label: string; items: Subject[] }[] = []
    const yearOrder = ['大一', '大二', '大三', '大四', '研究生']
    for (const y of yearOrder) {
      if (groups[y]) result.push({ label: y, items: groups[y] })
    }
    for (const [key, items] of Object.entries(groups)) {
      if (!yearOrder.includes(key)) result.push({ label: key, items })
    }
    if (ungrouped.length > 0) result.push({ label: '', items: ungrouped })
    return result
  }, [subjects])

  const isActive = (id: string | null) => currentSubjectId === id
  const activeBg = theme.id === 'dark' ? 'bg-gray-700' : 'bg-opacity-10'
  const activeText = `text-[${theme.colors.primary}]`

  return (
    <>
      <aside className="w-56 border-r flex flex-col flex-shrink-0" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}>
        <div className="p-4 border-b" style={{ borderColor: theme.colors.border }}>
          <h1 className="text-lg font-bold" style={{ color: theme.colors.primary }}>期末补完计划</h1>
          <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>AI 驱动的复习助手</p>
        </div>

        <nav className="flex-1 overflow-auto p-2">
          <button
            onClick={onSelectOverview}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: isActive(null) ? `${theme.colors.primary}15` : 'transparent',
              color: isActive(null) ? theme.colors.primary : theme.colors.text,
              fontWeight: isActive(null) ? 500 : 400,
            }}
          >
            <HomeOutlined className="text-lg" />
            总览
          </button>

          <div className="my-2 border-t" style={{ borderColor: theme.colors.border }} />

          {groupedSubjects.map((group) => (
            <div key={group.label || '_ungrouped'}>
              {group.label && (
                <div className="text-xs px-4 py-1.5 uppercase tracking-wide font-medium" style={{ color: theme.colors.textSecondary }}>
                  {group.label}
                </div>
              )}
              {group.items.map((subject) => (
                <div key={subject.id} className="group relative">
                  <button
                    onClick={() => onSelectSubject(subject.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: isActive(subject.id) ? `${theme.colors.primary}15` : 'transparent',
                      color: isActive(subject.id) ? theme.colors.primary : theme.colors.text,
                      fontWeight: isActive(subject.id) ? 500 : 400,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="flex-1 text-left truncate">{subject.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      Modal.confirm({
                        title: `删除学科「${subject.name}」？`,
                        content: '该学科下的资料和记录将被保留，但不再归属任何学科。',
                        okText: '删除',
                        okButtonProps: { danger: true },
                        onOk: () => onDeleteSubject(subject.id),
                      })
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-all"
                  >
                    <DeleteOutlined className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          ))}

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors mt-1"
            style={{ color: theme.colors.textSecondary }}
          >
            <PlusOutlined className="text-lg" />
            添加学科
          </button>
        </nav>

        <div className="p-4 border-t" style={{ borderColor: theme.colors.border }}>
          <p className="text-xs" style={{ color: theme.colors.textSecondary }}>v0.1.0</p>
        </div>
      </aside>

      <Modal
        title="新建学科"
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAdd}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学科名称</label>
            <Input
              placeholder="如：高等数学"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPressEnter={handleAdd}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学年（可选）</label>
            <Select
              placeholder="选择学年"
              value={newYear}
              onChange={setNewYear}
              allowClear
              className="w-full"
              options={YEAR_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    newColor === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default Sidebar
