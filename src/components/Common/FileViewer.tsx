import { useState, useEffect } from 'react'
import { Modal, Empty, Button, Segmented } from 'antd'
import { FilePdfOutlined, FileWordOutlined, FileTextOutlined, ExpandOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import PdfViewer from './PdfViewer'

interface Material {
  id: string
  name: string
  type: string
  size: string
  content: string
  addedAt: string
  filePath?: string
}

interface FileViewerProps {
  material: Material | null
  open: boolean
  onClose: () => void
}

const FileViewer = ({ material, open, onClose }: FileViewerProps) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted')
  const [fullScreen, setFullScreen] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  useEffect(() => {
    if (open) {
      setViewMode('formatted')
      setFullScreen(false)
      // Try to load the actual file for PDF rendering
      if (material?.type === 'pdf' && material.filePath) {
        fetchFile(material.filePath)
      }
    }
  }, [open, material?.id])

  const fetchFile = async (filePath: string) => {
    try {
      // In Electron, we can read the file via IPC
      const result = await window.electron?.ipcRenderer.invoke('file:getAsFile', filePath)
      if (result) {
        const blob = new Blob([result], { type: 'application/pdf' })
        const file = new File([blob], material?.name || 'document.pdf', { type: 'application/pdf' })
        setPdfFile(file)
      }
    } catch {
      // Fallback: file path not available, show text content
    }
  }

  if (!material) return null

  // PDF with full rendering
  if (material.type === 'pdf' && fullScreen && pdfFile) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <PdfViewer file={pdfFile} open={true} />
        <Button
          className="absolute top-2 right-2 z-50"
          onClick={() => setFullScreen(false)}
        >
          退出全屏
        </Button>
      </div>
    )
  }

  const renderContent = () => {
    if (!material.content) {
      return <Empty description="该文件无可读取的文本内容" />
    }

    if (viewMode === 'raw') {
      return (
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed p-4">
          {material.content}
        </pre>
      )
    }

    switch (material.type) {
      case 'markdown':
        try {
          const html = marked.parse(material.content) as string
          return (
            <div
              className="prose prose-sm max-w-none p-6
                prose-headings:text-gray-800 prose-headings:font-bold
                prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                prose-p:text-gray-600 prose-p:leading-relaxed
                prose-strong:text-gray-800
                prose-ul:list-disc prose-ol:list-decimal
                prose-li:text-gray-600
                prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        } catch {
          return <pre className="p-4 text-sm whitespace-pre-wrap">{material.content}</pre>
        }
      case 'pdf':
        return (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FilePdfOutlined className="text-red-500 text-xl" />
                  <div>
                    <p className="text-sm font-medium text-red-700">PDF 文件</p>
                    <p className="text-xs text-red-500">显示已提取的文本内容</p>
                  </div>
                </div>
                <Button
                  type="primary"
                  size="small"
                  icon={<ExpandOutlined />}
                  onClick={() => setFullScreen(true)}
                  disabled={!pdfFile}
                >
                  打开 PDF 阅读器
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {material.content}
            </div>
          </div>
        )
      case 'docx':
        return (
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <FileWordOutlined className="text-blue-500 text-lg" />
              <span className="text-sm text-blue-700">Word 文档 - 显示已提取的文本内容</span>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {material.content}
            </div>
          </div>
        )
      default:
        return (
          <div className="p-6">
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {material.content}
            </div>
          </div>
        )
    }
  }

  const typeIcon = {
    pdf: <FilePdfOutlined className="text-red-500" />,
    docx: <FileWordOutlined className="text-blue-500" />,
    markdown: <FileTextOutlined className="text-purple-500" />,
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {typeIcon[material.type as keyof typeof typeIcon] || <FileTextOutlined />}
          <span className="truncate max-w-md">{material.name}</span>
          <span className="text-xs text-gray-400 font-normal">{material.size}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={900}
      style={{ top: 20 }}
      footer={
        <div className="flex justify-between items-center">
          <Segmented
            size="small"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'formatted' | 'raw')}
            options={[
              { label: '格式化', value: 'formatted' },
              { label: '纯文本', value: 'raw' },
            ]}
          />
          <div className="flex gap-2">
            <span className="text-xs text-gray-400 self-center">
              {material.content.length.toLocaleString()} 字符
            </span>
            <Button onClick={onClose}>关闭</Button>
          </div>
        </div>
      }
    >
      <div className="max-h-[70vh] overflow-auto bg-white rounded-lg border border-gray-100">
        {renderContent()}
      </div>
    </Modal>
  )
}

export default FileViewer
