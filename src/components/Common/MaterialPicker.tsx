import { useState, useEffect } from 'react'
import { Checkbox, Collapse, Empty, Input } from 'antd'
import {
  FilePdfOutlined, FileWordOutlined, FileTextOutlined,
  FileImageOutlined, SearchOutlined,
} from '@ant-design/icons'

interface Material {
  id: string
  name: string
  type: string
  size: string
  content: string
  category: string
  addedAt: string
}

interface Category {
  id: string
  name: string
  color: string
}

interface MaterialPickerProps {
  value?: string[]
  onChange?: (selectedIds: string[], selectedMaterials: Material[]) => void
  materials?: Material[]
  categories?: Category[]
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FilePdfOutlined className="text-red-500" />
    case 'docx': return <FileWordOutlined className="text-blue-500" />
    case 'image': return <FileImageOutlined className="text-green-500" />
    case 'markdown': return <FileTextOutlined className="text-purple-500" />
    default: return <FileTextOutlined className="text-gray-500" />
  }
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'default', name: '未分类', color: '#8c8c8c' },
]

const MaterialPicker = ({ value = [], onChange, materials: propMaterials, categories: propCategories }: MaterialPickerProps) => {
  const [internalMaterials, setInternalMaterials] = useState<Material[]>([])
  const [internalCategories, setInternalCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // 如果父组件传了数据就用父组件的，否则自己加载
  const materials = propMaterials ?? internalMaterials
  const categories = propCategories ?? internalCategories

  const loadData = async () => {
    if (propMaterials !== undefined) return // 由父组件管理数据
    const [matData, catData] = await Promise.all([
      window.electron?.db.list('materials'),
      window.electron?.db.list('categories'),
    ])
    const mats = (matData as Material[]) || []
    const cats = (catData as Category[]) || []
    setInternalMaterials(mats)
    const finalCats = cats.length > 0 ? cats : DEFAULT_CATEGORIES
    setInternalCategories(finalCats)
    setExpandedKeys(finalCats.map((c) => c.id))
  }

  useEffect(() => {
    loadData()
  }, [])

  // 当父组件的 materials 变化时，自动展开有内容的分类
  useEffect(() => {
    if (propMaterials !== undefined && propCategories !== undefined) {
      setExpandedKeys(propCategories.map((c) => c.id))
    }
  }, [propMaterials, propCategories])

  const keyword = search.trim().toLowerCase()

  // 按分类分组资料
  const grouped = categories.map((cat) => {
    const catMaterials = materials.filter(
      (m) => m.category === cat.id && (!keyword || m.name.toLowerCase().includes(keyword))
    )
    return { ...cat, materials: catMaterials }
  }).filter((g) => g.materials.length > 0 || !keyword)

  const uncategorized = grouped.find((g) => g.id === 'default')
  const categorizedGroups = grouped.filter((g) => g.id !== 'default')

  const handleToggleCategory = (catId: string, checked: boolean) => {
    const catMaterials = materials.filter((m) => m.category === catId)
    const catIds = catMaterials.map((m) => m.id)
    let newSelected: string[]
    if (checked) {
      newSelected = [...new Set([...value, ...catIds])]
    } else {
      newSelected = value.filter((id) => !catIds.includes(id))
    }
    const newMats = materials.filter((m) => newSelected.includes(m.id))
    onChange?.(newSelected, newMats)
  }

  const handleToggleMaterial = (matId: string, checked: boolean) => {
    const newSelected = checked
      ? [...value, matId]
      : value.filter((id) => id !== matId)
    const newMats = materials.filter((m) => newSelected.includes(m.id))
    onChange?.(newSelected, newMats)
  }

  const isCategoryChecked = (catId: string) => {
    const catIds = materials.filter((m) => m.category === catId).map((m) => m.id)
    return catIds.length > 0 && catIds.every((id) => value.includes(id))
  }

  const isCategoryIndeterminate = (catId: string) => {
    const catIds = materials.filter((m) => m.category === catId).map((m) => m.id)
    const selected = catIds.filter((id) => value.includes(id))
    return selected.length > 0 && selected.length < catIds.length
  }

  const allChecked = materials.length > 0 && materials.every((m) => value.includes(m.id))
  const someSelected = value.length > 0

  const renderMaterialItem = (mat: Material) => (
    <div
      key={mat.id}
      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <Checkbox
        checked={value.includes(mat.id)}
        onChange={(e) => handleToggleMaterial(mat.id, e.target.checked)}
      />
      {getTypeIcon(mat.type)}
      <span className="text-sm flex-1 truncate">{mat.name}</span>
      <span className="text-xs text-gray-400">{mat.size}</span>
    </div>
  )

  const renderCategoryGroup = (cat: Category, catMaterials: Material[]) => {
    const checked = isCategoryChecked(cat.id)
    const indeterminate = isCategoryIndeterminate(cat.id)

    return {
      key: cat.id,
      label: (
        <div className="flex items-center gap-2 w-full">
          <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleToggleCategory(cat.id, e.target.checked)}
          />
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          <span className="flex-1 text-sm font-medium">{cat.name}</span>
          <span className="text-xs text-gray-400">{catMaterials.length}</span>
        </div>
      ),
      children: (
        <div className="space-y-0.5 max-h-48 overflow-auto">
          {catMaterials.map(renderMaterialItem)}
        </div>
      ),
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="搜索资料..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          allowClear
        />
      </div>

      {someSelected && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">已选 {value.length} / {materials.length}</span>
          <Checkbox
            checked={allChecked}
            onChange={(e) => {
              if (e.target.checked) {
                onChange?.(materials.map((m) => m.id), materials)
              } else {
                onChange?.([], [])
              }
            }}
          >
            <span className="text-xs">全选</span>
          </Checkbox>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {materials.length === 0 ? (
          <Empty description="暂无资料" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Collapse
            activeKey={expandedKeys}
            onChange={(keys) => setExpandedKeys(keys as string[])}
            ghost
            size="small"
            items={[
              ...categorizedGroups.map((g) => renderCategoryGroup(g, g.materials)),
              ...(uncategorized && uncategorized.materials.length > 0
                ? [renderCategoryGroup(uncategorized, uncategorized.materials)]
                : []),
            ]}
          />
        )}
      </div>
    </div>
  )
}

export default MaterialPicker
export type { Material, Category }
