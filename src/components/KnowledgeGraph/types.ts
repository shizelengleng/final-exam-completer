export interface ConceptNode {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
}

export interface ConceptEdge {
  from: string
  to: string
  type: string
  label: string
}

export interface KnowledgeGraphData {
  id: string
  subjectId: string
  title: string
  nodes: ConceptNode[]
  edges: ConceptEdge[]
  createdAt: string
}

export const CATEGORY_COLORS: Record<string, string> = {
  definition: '#1677ff',
  principle: '#52c41a',
  example: '#faad14',
  application: '#722ed1',
  theory: '#eb2f96',
  process: '#13c2c2',
  other: '#8c8c8c',
}

export const CATEGORY_LABELS: Record<string, string> = {
  definition: '定义',
  principle: '原理',
  example: '示例',
  application: '应用',
  theory: '理论',
  process: '流程',
  other: '其他',
}

export const DIFFICULTY_SIZES: Record<string, number> = {
  basic: 20,
  intermediate: 30,
  advanced: 40,
}

export const RELATION_LABELS: Record<string, string> = {
  prerequisite_of: '前置',
  part_of: '组成',
  influences: '影响',
  leads_to: '导致',
  example_of: '示例',
  contrasts_with: '对比',
  relates_to: '关联',
}
