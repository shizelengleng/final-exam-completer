import { useState, useEffect, useMemo } from 'react'
import { Card, Empty, Statistic, Row, Col, Tag, Progress, Button, List } from 'antd'
import { ReloadOutlined, WarningOutlined, TrophyOutlined } from '@ant-design/icons'

interface QuizRecord {
  questionId: string
  content: string
  correctAnswer: string
  userAnswer: string
  isCorrect: boolean
  type: string
  difficulty: string
  answeredAt: string
}

interface WrongQuestion {
  id: string
  questionId: string
  content: string
  correctAnswer: string
  userAnswer: string
  explanation: string
  type: string
  difficulty: string
  addedAt: string
}

const TYPE_LABELS: Record<string, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
  short_answer: '简答题',
  analysis: '资料分析题',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

interface WeakAnalysisProps {
  subjectId: string
}

const WeakAnalysis = ({ subjectId }: WeakAnalysisProps) => {
  const [history, setHistory] = useState<QuizRecord[]>([])
  const [wrongBook, setWrongBook] = useState<WrongQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [histData, wrongData] = await Promise.all([
        window.electron?.db.list('quizHistory'),
        window.electron?.db.list('wrongBook'),
      ])
      const allHist = (histData as QuizRecord[]) || []
      const allWrong = (wrongData as WrongQuestion[]) || []
      setHistory(allHist.filter((r) => (r as Record<string, unknown>).subjectId === subjectId))
      setWrongBook(allWrong.filter((r) => (r as Record<string, unknown>).subjectId === subjectId))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [subjectId])

  // 按题目去重统计（同一题多次答只算一次）
  const uniqueQuestions = useMemo(() => {
    const map = new Map<string, QuizRecord>()
    for (const r of history) {
      const existing = map.get(r.questionId)
      if (!existing || new Date(r.answeredAt) > new Date(existing.answeredAt)) {
        map.set(r.questionId, r)
      }
    }
    return Array.from(map.values())
  }, [history])

  // 总体统计
  const totalAnswered = uniqueQuestions.length
  const totalCorrect = uniqueQuestions.filter((q) => q.isCorrect).length
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  // 按题型统计
  const typeStats = useMemo(() => {
    const stats: Record<string, { total: number; correct: number }> = {}
    for (const q of uniqueQuestions) {
      const t = q.type || 'unknown'
      if (!stats[t]) stats[t] = { total: 0, correct: 0 }
      stats[t].total++
      if (q.isCorrect) stats[t].correct++
    }
    return Object.entries(stats).map(([type, s]) => ({
      type,
      label: TYPE_LABELS[type] || type,
      total: s.total,
      correct: s.correct,
      errorRate: s.total > 0 ? Math.round(((s.total - s.correct) / s.total) * 100) : 0,
    }))
  }, [uniqueQuestions])

  // 按难度统计
  const difficultyStats = useMemo(() => {
    const stats: Record<string, { total: number; correct: number }> = {}
    for (const q of uniqueQuestions) {
      const d = q.difficulty || 'medium'
      if (!stats[d]) stats[d] = { total: 0, correct: 0 }
      stats[d].total++
      if (q.isCorrect) stats[d].correct++
    }
    return Object.entries(stats).map(([diff, s]) => ({
      difficulty: diff,
      label: DIFFICULTY_LABELS[diff] || diff,
      total: s.total,
      correct: s.correct,
      errorRate: s.total > 0 ? Math.round(((s.total - s.correct) / s.total) * 100) : 0,
    }))
  }, [uniqueQuestions])

  // 最近答题趋势（按日期分组）
  const dailyTrend = useMemo(() => {
    const byDate: Record<string, { total: number; correct: number }> = {}
    for (const q of history) {
      const day = q.answeredAt.substring(0, 10)
      if (!byDate[day]) byDate[day] = { total: 0, correct: 0 }
      byDate[day].total++
      if (q.isCorrect) byDate[day].correct++
    }
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7) // 最近7天
      .map(([date, s]) => ({
        date,
        total: s.total,
        correct: s.correct,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      }))
  }, [history])

  // 高频错题（出现次数最多的错题）
  const frequentWrong = useMemo(() => {
    const countMap: Record<string, { question: WrongQuestion; count: number }> = {}
    for (const w of wrongBook) {
      const key = w.questionId
      if (!countMap[key]) countMap[key] = { question: w, count: 0 }
      countMap[key].count++
    }
    return Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [wrongBook])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">加载中...</p>
      </div>
    )
  }

  if (totalAnswered === 0 && wrongBook.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">薄弱点分析</h2>
          <p className="text-sm text-gray-500">基于你的答题数据，分析薄弱知识点和易错题型</p>
        </div>
        <Empty description="暂无答题数据，先去 AI 出题练习吧" className="mt-12" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">薄弱点分析</h2>
          <p className="text-sm text-gray-500">基于你的答题数据，分析薄弱知识点和易错题型</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      </div>

      {/* 总览卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已答题数" value={totalAnswered} suffix="题" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="正确率"
              value={accuracy}
              suffix="%"
              valueStyle={{ color: accuracy >= 60 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="错题本" value={wrongBook.length} suffix="题" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="答题次数"
              value={history.length}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 按题型分析 */}
        <Col span={12}>
          <Card title="题型分析" size="small">
            {typeStats.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-3">
                {typeStats.map((t) => (
                  <div key={t.type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{t.label}</span>
                      <span className="text-gray-500">{t.correct}/{t.total} 正确</span>
                    </div>
                    <Progress
                      percent={t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0}
                      size="small"
                      status={t.errorRate > 40 ? 'exception' : 'active'}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 按难度分析 */}
        <Col span={12}>
          <Card title="难度分析" size="small">
            {difficultyStats.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-3">
                {difficultyStats.map((d) => (
                  <div key={d.difficulty}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{d.label}</span>
                      <span className="text-gray-500">{d.correct}/{d.total} 正确</span>
                    </div>
                    <Progress
                      percent={d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0}
                      size="small"
                      status={d.errorRate > 40 ? 'exception' : 'active'}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 答题趋势 */}
        <Col span={12}>
          <Card title="最近答题趋势" size="small">
            {dailyTrend.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-2">
                {dailyTrend.map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 w-20">{d.date.substring(5)}</span>
                    <div className="flex-1">
                      <Progress
                        percent={d.accuracy}
                        size="small"
                        format={() => `${d.correct}/${d.total}`}
                        status={d.accuracy >= 60 ? 'active' : 'exception'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 高频错题 */}
        <Col span={12}>
          <Card
            title={<span><WarningOutlined className="text-orange-500 mr-1" />高频错题</span>}
            size="small"
          >
            {frequentWrong.length === 0 ? (
              <Empty description="暂无错题记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={frequentWrong}
                renderItem={(item) => (
                  <List.Item>
                    <div className="w-full">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-800 flex-1 mr-2 line-clamp-2">
                          {item.question.content}
                        </p>
                        <Tag color="red">错 {item.count} 次</Tag>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Tag color="red" className="!text-xs">你: {item.question.userAnswer}</Tag>
                        <Tag color="green" className="!text-xs">正: {item.question.correctAnswer}</Tag>
                        {item.question.type && (
                          <Tag className="!text-xs">{TYPE_LABELS[item.question.type] || item.question.type}</Tag>
                        )}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 薄弱点建议 */}
      {typeStats.filter((t) => t.errorRate > 40).length > 0 && (
        <Card
          title={<span><TrophyOutlined className="text-blue-500 mr-1" />薄弱点建议</span>}
          size="small"
        >
          <div className="space-y-2 text-sm text-gray-700">
            {typeStats
              .filter((t) => t.errorRate > 40)
              .map((t) => (
                <p key={t.type}>
                  「{t.label}」正确率仅 <span className="text-red-500 font-medium">{100 - t.errorRate}%</span>，
                  建议针对性多练习此题型。
                </p>
              ))}
            {difficultyStats
              .filter((d) => d.errorRate > 50)
              .map((d) => (
                <p key={d.difficulty}>
                  「{d.label}」难度正确率仅 <span className="text-red-500 font-medium">{100 - d.errorRate}%</span>，
                  建议先巩固基础再挑战高难度。
                </p>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default WeakAnalysis
