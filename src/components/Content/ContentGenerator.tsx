import { useState, useEffect } from 'react'
import { Button, Select, Input, message, Empty, Tag, Space, Tabs } from 'antd'
import { FileTextOutlined, AudioOutlined, VideoCameraOutlined, SaveOutlined, ExportOutlined, DownloadOutlined } from '@ant-design/icons'
import ConversationPanel from '../Common/ConversationPanel'
import MaterialPicker from '../Common/MaterialPicker'
import type { Material } from '../Common/MaterialPicker'

interface ContentGeneratorProps {
  subjectId: string
  defaultMode?: 'document' | 'article' | 'video'
}

type ContentMode = 'document' | 'article' | 'video'

const MODE_LABELS: Record<ContentMode, { label: string; icon: React.ReactNode; desc: string }> = {
  document: { label: '复习文档', icon: <FileTextOutlined />, desc: '系统化的期末复习资料' },
  article: { label: '知识文章', icon: <AudioOutlined />, desc: '深度知识讲解文章' },
  video: { label: '视频脚本', icon: <VideoCameraOutlined />, desc: '教学视频脚本' },
}

const TEMPLATES: Record<ContentMode, { value: string; label: string }[]> = {
  document: [
    { value: 'general', label: '通用复习文档' },
    { value: 'quick_ref', label: '速查手册' },
    { value: 'recite', label: '背诵手册' },
    { value: 'analysis', label: '材料分析题' },
  ],
  article: [
    { value: 'general', label: '通用文章' },
    { value: 'deep_dive', label: '深度讲解' },
    { value: 'tutorial', label: '教程指南' },
  ],
  video: [
    { value: 'general', label: '通用脚本' },
    { value: 'lecture', label: '课堂讲解' },
    { value: 'explainer', label: '知识科普' },
  ],
}

const ContentGenerator = ({ subjectId, defaultMode = 'document' }: ContentGeneratorProps) => {
  const [mode, setMode] = useState<ContentMode>(defaultMode)
  const [template, setTemplate] = useState('general')
  const [instruction, setInstruction] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [generatedTitle, setGeneratedTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([])
  const [contextPrompt, setContextPrompt] = useState('')

  useEffect(() => {
    loadMaterials()
  }, [subjectId])

  const loadMaterials = async () => {
    const data = await window.electron?.db.list('materials')
    const all = (data as Material[]) || []
    setAllMaterials(all.filter((m) => (m as Record<string, unknown>).subjectId === subjectId))
  }

  const handleGenerate = async () => {
    if (selectedMaterials.length === 0) {
      message.warning('请先选择资料')
      return
    }
    setLoading(true)
    try {
      const mats = selectedMaterials.map((m) => ({ name: m.name, content: m.content }))
      const result = await window.electron?.ai.generateDocument(mats, instruction, template)
      setGeneratedTitle(result.title)
      setGeneratedContent(result.content)
      setContextPrompt(`你正在帮助用户修改一份${MODE_LABELS[mode].label}。以下是当前文档内容：\n\n${result.content.substring(0, 8000)}\n\n用户可以要求你修改文档。请根据用户要求修改并返回完整的修改后文档。`)
      message.success(`${MODE_LABELS[mode].label}生成成功`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '生成失败'
      message.error(errMsg.includes('API Key') ? '请先在设置中配置 API Key' : errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleConversationSend = async (userMessage: string): Promise<string> => {
    const mats = selectedMaterials.map((m) => ({ name: m.name, content: m.content }))
    const revised = await window.electron?.ai.reviseDocument(generatedContent, userMessage, mats.length > 0 ? mats : undefined)
    if (revised) {
      setGeneratedContent(revised)
      setContextPrompt(`你正在帮助用户修改一份${MODE_LABELS[mode].label}。以下是当前文档内容：\n\n${revised.substring(0, 8000)}\n\n用户可以要求你修改文档。请根据用户要求修改并返回完整的修改后文档。`)
      return '文档已修改。以下是更新后的完整内容：\n\n' + revised.substring(0, 2000) + (revised.length > 2000 ? '\n\n...(内容已截断显示)' : '')
    }
    throw new Error('修改失败')
  }

  const handleSave = async () => {
    if (!generatedContent) { message.warning('请先生成内容'); return }
    const result = await window.electron?.wiki.saveQueryResult(subjectId, generatedTitle || '复习文档', generatedContent)
    if (result?.success) message.success('已保存到 Wiki')
    else message.error(result?.error || '保存失败')
  }

  const handleExportMd = async () => {
    if (!generatedContent) return
    await window.electron?.file.saveFile(generatedContent, `${generatedTitle || '复习文档'}.md`)
  }

  const handleExportPdf = async () => {
    if (!generatedContent) return
    const result = await window.electron?.file.exportPdf(generatedContent, `${generatedTitle || '复习文档'}.pdf`)
    if (result?.path) message.success('已导出 PDF')
    else if (result?.error) message.error(`导出失败: ${result.error}`)
  }

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left: Config */}
      <div className="w-72 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <Tabs
            activeKey={mode}
            onChange={(k) => { setMode(k as ContentMode); setTemplate('general') }}
            items={Object.entries(MODE_LABELS).map(([key, config]) => ({
              key,
              label: <span className="flex items-center gap-1">{config.icon}{config.label}</span>,
            }))}
            size="small"
          />
          <p className="text-xs text-gray-400 mb-3">{MODE_LABELS[mode].desc}</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">模板</p>
              <Select value={template} onChange={setTemplate} className="w-full" size="small"
                options={TEMPLATES[mode]} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">补充说明</p>
              <Input.TextArea rows={2} size="small" placeholder="如：重点复习第3章..."
                value={instruction} onChange={(e) => setInstruction(e.target.value)} />
            </div>
            <Button type="primary" block loading={loading} onClick={handleGenerate}
              disabled={selectedMaterialIds.length === 0}>
              {loading ? '生成中...' : `生成${MODE_LABELS[mode].label}`}
            </Button>
          </div>
        </div>

        {/* Materials */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-700">选择资料</span>
            {selectedMaterialIds.length > 0 && (
              <Tag color="blue" className="!text-xs !ml-auto">{selectedMaterialIds.length} 份</Tag>
            )}
          </div>
          <div className="h-40 overflow-auto">
            <MaterialPicker value={selectedMaterialIds} onChange={(ids, mats) => {
              setSelectedMaterialIds(ids)
              setSelectedMaterials(mats || allMaterials.filter(m => ids.includes(m.id)))
            }} materials={allMaterials} />
          </div>
        </div>
      </div>

      {/* Center: Preview */}
      <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm flex flex-col">
        {generatedContent ? (
          <>
            <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Tag color="blue">{MODE_LABELS[mode].label}</Tag>
                <span className="text-sm font-medium text-gray-700 truncate">{generatedTitle}</span>
              </div>
              <Space>
                <Button size="small" icon={<SaveOutlined />} onClick={handleSave}>保存到 Wiki</Button>
                <Button size="small" icon={<ExportOutlined />} onClick={handleExportMd}>Markdown</Button>
                <Button size="small" icon={<DownloadOutlined />} onClick={handleExportPdf}>PDF</Button>
              </Space>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: require('marked').marked(generatedContent) as string }} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty description={<span className="text-gray-400">选择资料后点击生成</span>} />
          </div>
        )}
      </div>

      {/* Right: Conversation Panel */}
      <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm flex flex-col">
        {generatedContent ? (
          <ConversationPanel
            subjectId={subjectId}
            feature={`content-${mode}`}
            contextPrompt={contextPrompt}
            onSend={handleConversationSend}
            placeholder="描述修改需求..."
            showSaveToWiki={false}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <Empty description={<span className="text-xs text-gray-400">生成后可在此对话修改</span>} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ContentGenerator
