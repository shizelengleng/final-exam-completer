import { useState, useEffect } from 'react'
import { Input, Button, Card, Tag, Empty, Checkbox, message } from 'antd'
import { SearchOutlined, DownloadOutlined, StarOutlined, LinkOutlined } from '@ant-design/icons'

interface SearchPanelProps {
  subjectId: string
}

const SearchPanel = ({ subjectId }: SearchPanelProps) => {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<SearchSource[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  useEffect(() => {
    window.electron?.search.getSources().then((s) => {
      setSources(s)
      setSelectedSources(s.map((src) => src.id))
    })
  }, [])

  const handleSearch = async () => {
    if (!keyword.trim()) {
      message.warning('请输入搜索关键词')
      return
    }
    setLoading(true)
    setResults([])
    try {
      const searchResults = await window.electron?.search.query(keyword, selectedSources)
      setResults(searchResults || [])
    } catch (err) {
      message.error('搜索失败: ' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (item: SearchResult) => {
    const material = {
      id: `mat_${Date.now()}`,
      name: item.title,
      type: 'search',
      size: '-',
      content: `${item.title}\n\n${item.summary}\n\n来源: ${item.source} (${item.url})`,
      subjectId,
      addedAt: new Date().toLocaleString('zh-CN'),
    }
    await window.electron?.db.add('materials', material)
    message.success(`已导入: ${item.title}`)
  }

  const typeLabel: Record<string, { color: string; text: string }> = {
    courseware: { color: 'blue', text: '课件' },
    qa: { color: 'orange', text: '问答' },
    video: { color: 'red', text: '视频' },
    academic: { color: 'green', text: '学术' },
    ebook: { color: 'purple', text: '电子书' },
    'pan-search': { color: 'cyan', text: '网盘' },
    code: { color: 'geekblue', text: '代码' },
    tech: { color: 'volcano', text: '技术' },
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-center pt-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">AI 智能搜集资料</h2>
        <p className="text-sm text-gray-500 mb-4">输入学科或关键词，AI 帮你从多个平台搜索优质复习资料</p>

        <div className="flex gap-3 w-full max-w-2xl">
          <Input
            size="large"
            placeholder="输入学科或关键词，如：高等数学、数据结构..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            className="flex-1"
          />
          <Button type="primary" size="large" loading={loading} onClick={handleSearch}>
            搜索
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap items-center justify-center mt-4">
          <span className="text-xs text-gray-400">搜索源：</span>
          {sources.map((source) => (
            <Checkbox
              key={source.id}
              checked={selectedSources.includes(source.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedSources((prev) => [...prev, source.id])
                } else {
                  setSelectedSources((prev) => prev.filter((id) => id !== source.id))
                }
              }}
              className="!text-xs"
            >
              <Tag color={typeLabel[source.type]?.color || 'default'} className="!text-xs !m-0">
                {source.name}
              </Tag>
            </Checkbox>
          ))}
        </div>
      </div>

      {results.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">找到 {results.length} 个结果</p>
          {results.map((item) => (
            <Card key={item.id} hoverable className="shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800">{item.title}</h3>
                    <LinkOutlined className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{item.summary}</p>
                  <div className="flex gap-2 mt-2">
                    <Tag>{item.source}</Tag>
                    <Tag color={typeLabel[item.type]?.color || 'default'}>
                      {typeLabel[item.type]?.text || item.type}
                    </Tag>
                    <span className="text-xs text-gray-400">
                      相关度: {Math.round(item.score * 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button icon={<DownloadOutlined />} size="small" onClick={() => handleImport(item)}>
                    导入
                  </Button>
                  <Button icon={<StarOutlined />} size="small" type="text">
                    收藏
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        !loading && <Empty description="输入关键词开始搜索" className="mt-12" />
      )}
    </div>
  )
}

export default SearchPanel
