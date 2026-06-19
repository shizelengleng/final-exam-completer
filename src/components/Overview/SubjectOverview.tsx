import { useState, useEffect, useMemo } from 'react'
import { Input, Empty } from 'antd'
import { SendOutlined, BookOutlined, CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons'

interface SubjectOverviewProps {
  subjects: Subject[]
  onSelectSubject: (id: string) => void
  onAddSubject: (name: string, color: string, year?: string) => void
  onDeleteSubject: (id: string) => void
}

interface SubjectStats {
  materialCount: number
  quizTotal: number
  quizCorrect: number
  wrongCount: number
}

const QUICK_ACTIONS = [
  { label: 'AI 出题', desc: '基于资料自动生成练习题', icon: '📝' },
  { label: '整理笔记', desc: 'AI 帮你梳理复习资料', icon: '📚' },
  { label: '错题重练', desc: '针对薄弱点强化训练', icon: '🔄' },
  { label: '知识图谱', desc: '可视化知识点关系', icon: '🧠' },
]

const SubjectOverview = ({ subjects, onSelectSubject, onAddSubject }: SubjectOverviewProps) => {
  const [needsInput, setNeedsInput] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [statsMap, setStatsMap] = useState<Record<string, SubjectStats>>({})
  const [aiReply, setAiReply] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    loadStats()
  }, [subjects])

  const loadStats = async () => {
    const [matData, histData, wrongData] = await Promise.all([
      window.electron?.db.list('materials'),
      window.electron?.db.list('quizHistory'),
      window.electron?.db.list('wrongBook'),
    ])

    const materials = (matData as { subjectId?: string }[]) || []
    const history = (histData as { subjectId?: string; isCorrect?: boolean }[]) || []
    const wrong = (wrongData as { subjectId?: string }[]) || []

    const map: Record<string, SubjectStats> = {}
    for (const s of subjects) {
      const sid = s.id
      const subMats = materials.filter((m) => m.subjectId === sid)
      const subHist = history.filter((h) => h.subjectId === sid)
      const subWrong = wrong.filter((w) => w.subjectId === sid)
      map[sid] = {
        materialCount: subMats.length,
        quizTotal: subHist.length,
        quizCorrect: subHist.filter((h) => h.isCorrect).length,
        wrongCount: subWrong.length,
      }
    }
    setStatsMap(map)
  }

  const years = useMemo(() => {
    const set = new Set<string>()
    for (const s of subjects) {
      if (s.year) set.add(s.year)
    }
    return Array.from(set)
  }, [subjects])

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const matchYear = selectedYear === 'all' || s.year === selectedYear
      return matchYear
    })
  }, [subjects, selectedYear])

  const handleNeedsSubmit = async () => {
    const text = needsInput.trim()
    if (!text || aiLoading) return
    setAiLoading(true)
    setAiReply('')
    try {
      const reply = await window.electron?.ai.chat(
        `你是期末补完计划的 AI 助手。用户在总览页面说：「${text}」。请简要回复，告诉用户你理解了他的需求，并建议他去哪个功能模块操作。如果涉及出题建议去"AI 出题"，涉及笔记整理建议去"文档生成"，涉及错题建议去"错题本"，涉及知识图谱建议去"知识图谱"。回复要简短友好，2-3句话。`
      )
      setAiReply(reply || '收到你的需求！')
    } catch {
      setAiReply('请先在设置中配置 API Key')
    } finally {
      setAiLoading(false)
    }
  }

  const handleQuickAction = (label: string) => {
    setNeedsInput(label)
  }

  return (
    <div className="flex flex-col items-center pt-16 pb-6 px-6 min-h-full">
      <h1 className="text-5xl font-black text-gray-900 mb-8 tracking-tight select-none">
        期末补完计划
      </h1>

      {/* Needs Input Box */}
      <div className="w-full max-w-xl mb-8">
        <div className="relative">
          <Input
            placeholder="今天你要干点啥？"
            value={needsInput}
            onChange={(e) => setNeedsInput(e.target.value)}
            onPressEnter={handleNeedsSubmit}
            suffix={
              <button
                onClick={handleNeedsSubmit}
                disabled={!needsInput.trim() || aiLoading}
                className="text-blue-500 hover:text-blue-600 disabled:text-gray-300 transition-colors"
              >
                <SendOutlined />
              </button>
            }
            className="!text-base !py-3 !px-5 !rounded-2xl !shadow-md !border-gray-200 focus:!shadow-lg"
            style={{ height: 52 }}
          />
        </div>

        {/* Quick Action Pills */}
        <div className="flex gap-2 mt-3 flex-wrap justify-center">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* AI Reply */}
        {aiReply && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
            <RobotOutlined className="text-blue-500 text-lg flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{aiReply}</p>
          </div>
        )}
      </div>

      {/* Year Filter */}
      {years.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              selectedYear === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                selectedYear === y
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Subject Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Empty description="暂无学科" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full max-w-5xl">
          {filtered.map((subject) => {
            const stats = statsMap[subject.id] || { materialCount: 0, quizTotal: 0, quizCorrect: 0, wrongCount: 0 }
            const accuracy = stats.quizTotal > 0 ? Math.round((stats.quizCorrect / stats.quizTotal) * 100) : 0

            return (
              <div
                key={subject.id}
                onClick={() => onSelectSubject(subject.id)}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="font-semibold text-gray-800 truncate">{subject.name}</span>
                  {subject.year && (
                    <span className="text-xs text-gray-400 ml-auto">{subject.year}</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{stats.materialCount}</div>
                    <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                      <BookOutlined /> 资料
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{accuracy}%</div>
                    <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                      <CheckCircleOutlined /> 正确率
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-500">{stats.wrongCount}</div>
                    <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                      <CloseCircleOutlined /> 错题
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <div
            onClick={() => onAddSubject('新学科', '#1677ff')}
            className="bg-white rounded-xl p-5 shadow-sm border-2 border-dashed border-gray-200 hover:border-blue-300 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 min-h-[120px]"
          >
            <PlusOutlined className="text-2xl" />
            <span className="text-sm">添加学科</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubjectOverview
