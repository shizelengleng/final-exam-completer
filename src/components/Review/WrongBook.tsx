import { useState, useEffect } from 'react'
import { Card, Button, Empty, Tag, Popconfirm, message } from 'antd'
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons'

interface WrongQuestion {
  id: string
  questionId: string
  content: string
  options: { value: string; label: string }[]
  correctAnswer: string
  userAnswer: string
  explanation: string
  addedAt: string
}

interface WrongBookProps {
  subjectId: string
}

const WrongBook = ({ subjectId }: WrongBookProps) => {
  const [questions, setQuestions] = useState<WrongQuestion[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadQuestions()
  }, [subjectId])

  const loadQuestions = async () => {
    const data = await window.electron?.db.list('wrongBook')
    const all = (data as WrongQuestion[]) || []
    setQuestions(all.filter((q) => (q as Record<string, unknown>).subjectId === subjectId))
  }

  const handleDelete = async (id: string) => {
    await window.electron?.db.delete('wrongBook', id)
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    message.success('已删除')
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">错题本</h2>
        <p className="text-sm text-gray-500">答错的题目自动记录在这里，支持重练</p>
      </div>

      {questions.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">共 {questions.length} 道错题</p>
          {questions.map((q) => (
            <Card key={q.id} size="small">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-gray-800 mb-2">{q.content}</p>
                  <div className="flex gap-2">
                    <Tag color="red">你的答案: {q.userAnswer}</Tag>
                    <Tag color="green">正确答案: {q.correctAnswer}</Tag>
                    <Tag>{q.addedAt}</Tag>
                  </div>
                  {expandedId === q.id && (
                    <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-gray-700">
                      <p className="font-medium text-blue-700 mb-1">解析：</p>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="small" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                    {expandedId === q.id ? '收起' : '解析'}
                  </Button>
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(q.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty description="暂无错题，继续加油！" className="mt-12" />
      )}
    </div>
  )
}

export default WrongBook
