import { useState, useEffect } from 'react'
import { Upload, Card, Button, Empty, Tag, message, Input, Popover, Modal, Switch } from 'antd'
import {
  InboxOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined,
  DeleteOutlined, FileTextOutlined, FolderOutlined, PlusOutlined, CloseOutlined,
  RobotOutlined, EyeOutlined, StarOutlined, StarFilled,
} from '@ant-design/icons'
import FileViewer from '../Common/FileViewer'

const { Dragger } = Upload

interface MaterialItem {
  id: string
  name: string
  type: string
  size: string
  content: string
  subjectId: string
  tag?: string
  favorite?: boolean
  addedAt: string
  filePath?: string
}

interface TagItem {
  id: string
  name: string
  color: string
}

const DEFAULT_TAGS: TagItem[] = [
  { id: 'default', name: '未分类', color: '#8c8c8c' },
]

interface MaterialListProps {
  subjectId: string
}

const MaterialList = ({ subjectId }: MaterialListProps) => {
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [tags, setTags] = useState<TagItem[]>(DEFAULT_TAGS)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#1677ff')
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [autoTag, setAutoTag] = useState(false)
  const [viewingMaterial, setViewingMaterial] = useState<MaterialItem | null>(null)

  useEffect(() => {
    loadData()
  }, [subjectId])

  const loadData = async () => {
    const data = await window.electron?.db.list('materials')
    const all = (data as MaterialItem[]) || []
    setMaterials(all.filter((m) => m.subjectId === subjectId))
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      message.warning('请输入标签名称')
      return
    }
    const newTag: TagItem = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor,
    }
    setTags((prev) => [...prev, newTag])
    setNewTagName('')
    message.success('已添加标签')
  }

  const handleDeleteTag = (id: string) => {
    if (id === 'default') return
    setTags((prev) => prev.filter((t) => t.id !== id))
    setMaterials((prev) =>
      prev.map((m) => (m.tag === id ? { ...m, tag: 'default' } : m))
    )
    message.success('已删除标签')
  }

  const handleAssignTag = async (materialId: string, tagId: string) => {
    await window.electron?.db.update('materials', materialId, { tag: tagId })
    setMaterials((prev) =>
      prev.map((m) => (m.id === materialId ? { ...m, tag: tagId } : m))
    )
    setEditingMaterialId(null)
  }

  const readFileContent = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (ext === 'md' || ext === 'txt') {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsText(file)
      })
    }
    if (ext === 'pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await window.electron?.ipcRenderer.invoke('file:readPdf', Array.from(new Uint8Array(arrayBuffer)))
        return (result as string) || `[PDF] ${file.name}`
      } catch {
        return `[PDF] ${file.name}`
      }
    }
    if (ext === 'docx' || ext === 'doc') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await window.electron?.ipcRenderer.invoke('file:readDocx', Array.from(new Uint8Array(arrayBuffer)))
        return (result as string) || `[DOCX] ${file.name}`
      } catch {
        return `[DOCX] ${file.name}`
      }
    }
    return `[${ext.toUpperCase()}] ${file.name}`
  }

  const handleUpload = async (file: File) => {
    const ext = file.name.split('.').pop() || ''
    const typeMap: Record<string, string> = {
      pdf: 'pdf', docx: 'docx', doc: 'docx', png: 'image', jpg: 'image', jpeg: 'image', md: 'markdown', txt: 'text',
    }

    message.loading({ content: '正在读取文件内容...', key: 'upload', duration: 0 })
    const content = await readFileContent(file)

    let filePath = ''
    if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const saveResult = await window.electron?.file.saveUpload(file.name, Array.from(new Uint8Array(arrayBuffer)))
        if (saveResult?.path) filePath = saveResult.path
      } catch {
        // Non-critical
      }
    }

    message.destroy('upload')

    let assignedTag = selectedTag !== 'all' ? selectedTag : 'default'

    const newMaterial: MaterialItem = {
      id: `mat_${Date.now()}`,
      name: file.name,
      type: typeMap[ext] || ext,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      content,
      subjectId,
      tag: assignedTag,
      addedAt: new Date().toLocaleString('zh-CN'),
      filePath,
    }

    await window.electron?.db.add('materials', newMaterial)
    setMaterials((prev) => [newMaterial, ...prev])

    const tagName = tags.find((t) => t.id === assignedTag)?.name || '未分类'
    message.success(`已上传: ${file.name} (标签: ${tagName})`)
    return false
  }

  const handleDelete = async (id: string) => {
    await window.electron?.db.delete('materials', id)
    setMaterials((prev) => prev.filter((m) => m.id !== id))
    message.success('已删除')
  }

  const handleToggleFavorite = async (id: string) => {
    const material = materials.find((m) => m.id === id)
    if (!material) return
    const newFavorite = !material.favorite
    await window.electron?.db.update('materials', id, { favorite: newFavorite })
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, favorite: newFavorite } : m))
    )
    message.success(newFavorite ? '已收藏' : '已取消收藏')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FilePdfOutlined className="text-red-500 text-lg" />
      case 'docx': return <FileWordOutlined className="text-blue-500 text-lg" />
      case 'image': return <FileImageOutlined className="text-green-500 text-lg" />
      case 'markdown': return <FileTextOutlined className="text-purple-500 text-lg" />
      default: return <FileTextOutlined className="text-gray-500 text-lg" />
    }
  }

  const getTagColor = (tagId: string) =>
    tags.find((t) => t.id === tagId)?.color || '#8c8c8c'
  const getTagName = (tagId: string) =>
    tags.find((t) => t.id === tagId)?.name || '未分类'

  const filtered = selectedTag === 'all'
    ? materials
    : selectedTag === 'favorite'
    ? materials.filter((m) => m.favorite)
    : materials.filter((m) => m.tag === selectedTag)

  const sorted = [...filtered].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1
    return 0
  })

  return (
    <div className="flex h-full gap-4 p-6">
      {/* Left: Tag Sidebar */}
      <div className="w-52 flex-shrink-0 bg-white rounded-xl p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">标签</h3>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setShowTagModal(true)}
          />
        </div>

        <div className="space-y-1 flex-1 overflow-auto">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              selectedTag === 'all' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedTag('all')}
          >
            <FolderOutlined />
            <span className="text-sm">全部资料</span>
            <span className="text-xs text-gray-400 ml-auto">{materials.length}</span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              selectedTag === 'favorite' ? 'bg-yellow-50 text-yellow-600' : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedTag('favorite')}
          >
            <StarFilled className="text-yellow-500" />
            <span className="text-sm">收藏</span>
            <span className="text-xs text-gray-400 ml-auto">{materials.filter((m) => m.favorite).length}</span>
          </div>

          {tags.map((tag) => {
            const count = materials.filter((m) => m.tag === tag.id).length
            return (
              <div
                key={tag.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                  selectedTag === tag.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTag(tag.id)}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-sm flex-1 truncate">{tag.name}</span>
                <span className="text-xs text-gray-400">{count}</span>
                {tag.id !== 'default' && (
                  <Button
                    type="text"
                    size="small"
                    className="opacity-0 group-hover:opacity-100 !p-0"
                    icon={<CloseOutlined className="text-xs" />}
                    onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id) }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Material List */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">我的资料</h2>
          <p className="text-sm text-gray-500">上传 PDF、Word、Markdown 等复习资料</p>
        </div>

        <Dragger
          multiple
          showUploadList={false}
          beforeUpload={(file) => { handleUpload(file as unknown as File); return false }}
          className="bg-white rounded-lg"
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 PDF、DOCX、Markdown 格式，当前标签：
            {selectedTag === 'all' ? '全部' : getTagName(selectedTag)}
          </p>
        </Dragger>

        {sorted.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              共 {sorted.length} 份资料
              {selectedTag === 'favorite' && ' (收藏)'}
              {selectedTag !== 'all' && selectedTag !== 'favorite' && ` (标签: ${getTagName(selectedTag)})`}
            </p>
            {sorted.map((item) => (
              <Card key={item.id} size="small" hoverable className="shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(item.type)}
                    <div>
                      <p
                        className="font-medium text-gray-800 hover:text-blue-500 cursor-pointer flex items-center gap-1"
                        onClick={() => setViewingMaterial(item)}
                      >
                        {item.name}
                        <EyeOutlined className="text-xs text-gray-400" />
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.size} · {item.addedAt}
                        {item.content && <span className="ml-2 text-green-500">已读取</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="text"
                      icon={item.favorite ? <StarFilled className="text-yellow-500" /> : <StarOutlined className="text-gray-400" />}
                      onClick={() => handleToggleFavorite(item.id)}
                    />
                    <Popover
                      trigger="click"
                      open={editingMaterialId === item.id}
                      onOpenChange={(open) => setEditingMaterialId(open ? item.id : null)}
                      content={
                        <div className="w-48">
                          <p className="text-xs text-gray-500 mb-2">分配到标签：</p>
                          {tags.map((tag) => (
                            <div
                              key={tag.id}
                              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 text-sm ${
                                item.tag === tag.id ? 'bg-blue-50 text-blue-600' : ''
                              }`}
                              onClick={() => handleAssignTag(item.id, tag.id)}
                            >
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                              {tag.name}
                            </div>
                          ))}
                        </div>
                      }
                    >
                      <Tag
                        color={getTagColor(item.tag || 'default')}
                        className="cursor-pointer"
                        style={{ borderColor: getTagColor(item.tag || 'default') }}
                      >
                        {getTagName(item.tag || 'default')}
                      </Tag>
                    </Popover>
                    <Tag color="blue">{item.type}</Tag>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="还没有资料，上传一份开始吧" className="mt-12" />
        )}
      </div>

      {/* Tag Management Modal */}
      <Modal
        title="管理标签"
        open={showTagModal}
        onCancel={() => setShowTagModal(false)}
        footer={null}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="新标签名称" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onPressEnter={handleAddTag} />
            <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-10 h-9 rounded cursor-pointer border-0" />
            <Button type="primary" onClick={handleAddTag}>添加</Button>
          </div>
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm">{tag.name}</span>
                  <span className="text-xs text-gray-400">({materials.filter((m) => m.tag === tag.id).length} 份)</span>
                </div>
                {tag.id !== 'default' && (
                  <Button type="text" danger size="small" onClick={() => handleDeleteTag(tag.id)}>删除</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <FileViewer material={viewingMaterial} open={!!viewingMaterial} onClose={() => setViewingMaterial(null)} />
    </div>
  )
}

export default MaterialList
