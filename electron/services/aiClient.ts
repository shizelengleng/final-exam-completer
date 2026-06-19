import fetch from 'node-fetch'

export type AIProvider = 'deepseek' | 'mimo' | 'claude-code'

interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl: string
}

const PROVIDER_CONFIG: Record<Exclude<AIProvider, 'claude-code'>, { baseUrl: string; model: string }> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  mimo: {
    baseUrl: 'https://api.xiaomimimo.com',
    model: 'mimo-v2-flash',
  },
}

async function callClaudeCLI(prompt: string): Promise<string> {
  try {
    // Use stdin pipe to avoid shell escaping and CLI file-access sandbox issues
    const { execSync } = require('child_process')
    const result = execSync(
      'claude -p - --output-format json --no-session-persistence',
      { input: prompt, timeout: 120000, maxBuffer: 10 * 1024 * 1024, encoding: 'utf-8' }
    )
    const parsed = JSON.parse(result.trim())
    return parsed.result || ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('command not found') || msg.includes('ENOENT')) {
      throw new Error('未找到 claude CLI，请先安装 Claude Code: npm install -g @anthropic-ai/claude-code')
    }
    throw new Error(`Claude CLI 调用失败: ${msg}`)
  }
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

async function callAI(
  config: AIConfig,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (config.provider === 'claude-code') {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) throw new Error('No user message')
    // For CLI, combine system + conversation into a single prompt
    const systemMsg = messages.find((m) => m.role === 'system')
    const conversationParts = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')
    const fullPrompt = systemMsg
      ? `${systemMsg.content}\n\n${conversationParts}`
      : conversationParts
    return callClaudeCLI(fullPrompt)
  }

  const providerConfig = PROVIDER_CONFIG[config.provider as Exclude<AIProvider, 'claude-code'>]
  if (!providerConfig) throw new Error(`未知的 AI 提供商: ${config.provider}`)
  const baseUrl = config.baseUrl || providerConfig.baseUrl

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: providerConfig.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI API 调用失败: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 返回内容为空')
  return content
}

export interface GenerateQuestionParams {
  content: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'analysis'
  difficulty: 'easy' | 'medium' | 'hard'
  count: number
}

export interface GeneratedQuestion {
  id: string
  content: string
  options: { value: string; label: string }[]
  answer: string
  explanation: string
  type: string
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
  short_answer: '简答题',
  analysis: '资料分析题',
}

function buildPrompt(params: GenerateQuestionParams): string {
  const typeLabel = QUESTION_TYPE_LABELS[params.type]
  const difficultyLabel = { easy: '简单', medium: '中等', hard: '困难' }[params.difficulty]

  return `你是一个专业的期末考试出题专家。请根据以下学习资料，生成${params.count}道${typeLabel}。

难度要求：${difficultyLabel}
题目类型：${typeLabel}

学习资料：
${params.content.substring(0, 8000)}

请严格按以下 JSON 格式返回，不要包含任何其他文字：
[
  {
    "content": "题目内容",
    "options": [
      {"value": "A", "label": "A. 选项内容"},
      {"value": "B", "label": "B. 选项内容"}
    ],
    "answer": "A",
    "explanation": "解析说明"
  }
]

注意：
- 判断题的选项固定为：{"value": "true", "label": "A. 正确"}，{"value": "false", "label": "B. 错误"}
- 简答题和分析题的 options 设为空数组，answer 为参考答案
- 多选题的 answer 用逗号分隔，如 "A,B,C"
- 确保返回合法的 JSON 数组`
}

function parseQuestions(raw: string, type?: string): GeneratedQuestion[] {
  // 提取 JSON 部分（兼容 markdown code block）
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('AI 返回格式错误，无法解析题目')

  const parsed = JSON.parse(jsonMatch[0])
  return parsed.map((q: Record<string, unknown>, i: number) => ({
    id: `ai_${Date.now()}_${i}`,
    content: q.content as string,
    options: (q.options as { value: string; label: string }[]) || [],
    answer: q.answer as string,
    explanation: q.explanation as string,
    type: type || '',
  }))
}

export async function generateQuestions(
  config: AIConfig,
  params: GenerateQuestionParams
): Promise<GeneratedQuestion[]> {
  const prompt = buildPrompt(params)
  const content = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 4096 })
  return parseQuestions(content, params.type)
}

export interface GraphConcept {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
}

export interface GraphRelation {
  from: string
  to: string
  type: string
  label: string
}

export interface GraphResult {
  nodes: GraphConcept[]
  edges: GraphRelation[]
}

function buildGraphPrompt(subject: string): string {
  return `你是一个知识图谱构建专家。请根据学科主题"${subject}"，提取核心知识点和它们之间的关系。

要求：
1. 提取 10-20 个核心概念节点
2. 概念分为以下类别：definition(定义), principle(原理), example(示例), application(应用), theory(理论), process(流程)
3. 概念难度分为：basic(基础), intermediate(中级), advanced(高级)
4. 提取概念之间的关系，关系类型包括：prerequisite_of(前置知识), part_of(组成部分), influences(影响), leads_to(导致), example_of(示例), contrasts_with(对比), relates_to(关联)
5. 每个关系需要有简洁的中文标签

请严格按以下 JSON 格式返回，不要包含任何其他文字：
{
  "nodes": [
    {
      "id": "c1",
      "name": "概念名称",
      "description": "简短描述",
      "category": "definition",
      "difficulty": "basic"
    }
  ],
  "edges": [
    {
      "from": "c1",
      "to": "c2",
      "type": "prerequisite_of",
      "label": "前置"
    }
  ]
}`
}

function buildGraphFromContentPrompt(content: string): string {
  return `你是一个知识图谱构建专家。请根据以下学习资料内容，提取核心知识点和它们之间的关系。

资料内容：
${content}

要求：
1. 从资料中提取 10-20 个核心概念节点，必须基于资料实际内容
2. 概念分为以下类别：definition(定义), principle(原理), example(示例), application(应用), theory(理论), process(流程)
3. 概念难度分为：basic(基础), intermediate(中级), advanced(高级)
4. 提取概念之间的关系，关系类型包括：prerequisite_of(前置知识), part_of(组成部分), influences(影响), leads_to(导致), example_of(示例), contrasts_with(对比), relates_to(关联)
5. 每个关系需要有简洁的中文标签
6. 每个概念的 description 应从资料中提取具体说明

请严格按以下 JSON 格式返回，不要包含任何其他文字：
{
  "nodes": [
    {
      "id": "c1",
      "name": "概念名称",
      "description": "从资料中提取的简短描述",
      "category": "definition",
      "difficulty": "basic"
    }
  ],
  "edges": [
    {
      "from": "c1",
      "to": "c2",
      "type": "prerequisite_of",
      "label": "前置"
    }
  ]
}`
}

function parseGraph(raw: string): GraphResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式错误，无法解析知识图谱')

  const parsed = JSON.parse(jsonMatch[0])
  return {
    nodes: (parsed.nodes || []).map((n: Record<string, string>, i: number) => ({
      id: n.id || `c${i + 1}`,
      name: n.name || '',
      description: n.description || '',
      category: ['definition', 'principle', 'example', 'application', 'theory', 'process'].includes(n.category) ? n.category : 'other',
      difficulty: ['basic', 'intermediate', 'advanced'].includes(n.difficulty) ? n.difficulty : 'basic',
    })),
    edges: (parsed.edges || []).map((e: Record<string, string>) => ({
      from: e.from || '',
      to: e.to || '',
      type: ['prerequisite_of', 'part_of', 'influences', 'leads_to', 'example_of', 'contrasts_with', 'relates_to'].includes(e.type) ? e.type : 'relates_to',
      label: e.label || '',
    })),
  }
}

export async function generateGraph(
  config: AIConfig,
  subject: string
): Promise<GraphResult> {
  const prompt = buildGraphPrompt(subject)
  const result = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 4096 })
  return parseGraph(result)
}

export async function generateGraphFromContent(
  config: AIConfig,
  content: string
): Promise<GraphResult> {
  const prompt = buildGraphFromContentPrompt(content)
  const result = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 4096 })
  return parseGraph(result)
}

export async function categorizeMaterial(
  config: AIConfig,
  materialName: string,
  materialContent: string,
  existingCategories: string[]
): Promise<string> {
  const catList = existingCategories.join('、')
  const prompt = `你是一个资料分类助手。请根据以下资料的文件名和内容摘要，判断它属于哪个学科分类。

已有分类：${catList}

资料文件名：${materialName}
内容摘要：${materialContent.substring(0, 500)}

请只返回分类名称（必须是已有分类之一），不要返回其他内容。`

  const result = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 50 })
  const trimmed = result.trim()
  const matched = existingCategories.find((c) => trimmed.includes(c))
  return matched || existingCategories[0] || 'default'
}

export interface GraphInstructionResult {
  materialIds: string[]
  instruction: string
}

export async function selectMaterialsForGraph(
  config: AIConfig,
  userMessage: string,
  materialList: { id: string; name: string; content: string }[]
): Promise<GraphInstructionResult> {
  const matSummary = materialList
    .map((m, i) => `${i + 1}. [id:${m.id}] ${m.name} (前200字: ${m.content.substring(0, 200)})`)
    .join('\n')

  const prompt = `你是一个学习助手。用户想要生成知识图谱，请根据用户的需求和可用资料，选择最相关的资料。

用户需求：${userMessage}

可用资料：
${matSummary}

请返回 JSON 格式：
{
  "materialIds": ["选中的资料id"],
  "instruction": "根据用户需求总结的生成指令"
}

只返回 JSON，不要其他内容。`

  const content = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 1024 })
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式错误')

  const parsed = JSON.parse(jsonMatch[0])
  return {
    materialIds: parsed.materialIds || materialList.map((m) => m.id),
    instruction: parsed.instruction || userMessage,
  }
}

export async function chat(
  config: AIConfig,
  message: string
): Promise<string> {
  return callAI(config, [{ role: 'user', content: message }], { temperature: 0.7, maxTokens: 2048 })
}

export interface SourceManageResult {
  action: string
  source?: { name: string; type: string; searchUrl: string; enabled: boolean; priority: number }
  sourceId?: string
  message: string
}

export async function manageSources(
  config: AIConfig,
  userMessage: string,
  currentSources: { id: string; name: string; type: string; searchUrl: string; enabled: boolean; priority: number }[]
): Promise<SourceManageResult> {
  const sourceList = currentSources
    .map((s) => `- ${s.id}: ${s.name} (类型:${s.type}, URL:${s.searchUrl}, ${s.enabled ? '启用' : '禁用'}, 优先级:${s.priority})`)
    .join('\n')

  const prompt = `你是一个搜索源管理助手。用户可以让你添加、修改、删除或禁用搜索源。
用户请求：${userMessage}
当前搜索源列表：
${sourceList}

可使用的类型: courseware(课件), qa(问答), video(视频), academic(学术), ebook(电子书), pan-search(网盘), code(代码), tech(技术)

请根据用户意图返回 JSON：
{
  "action": "add" | "update" | "delete" | "toggle" | "list",
  "source": { "name": "名称", "type": "类型", "searchUrl": "搜索URL", "enabled": true, "优先级": N },
  "sourceId": "用于update/delete/toggle的id",
  "message": "操作说明"
}

规则：
- add: 必须提供 source 对象，priority 默认为当前最大值+1
- update: 必须提供 sourceId 和要更新的 source 字段
- delete: 必须提供 sourceId
- toggle: 必须提供 sourceId，切换启用/禁用
- list: 仅列出当前所有源，不需要 source 和 sourceId

只返回 JSON，不要其他内容。`

  const content = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 1024 })
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式错误')

  const parsed = JSON.parse(jsonMatch[0])
  return {
    action: parsed.action || 'list',
    source: parsed.source,
    sourceId: parsed.sourceId,
    message: parsed.message || '操作完成',
  }
}

export interface DocumentResult {
  title: string
  content: string
}

function buildDocumentPrompt(
  materials: { name: string; content: string }[],
  instruction: string,
  template: string
): string {
  const matContent = materials
    .map((m) => `【${m.name}】\n${m.content.substring(0, 5000)}`)
    .join('\n\n---\n\n')
    .substring(0, 25000)

  const formatRules = `你是一位专业的期末考试复习资料整理专家。请根据学习资料生成一份系统的复习文档。

排版格式要求：
1. **表格优先**：概念对比、参数、分类、步骤等事实性内容用 Markdown 表格呈现
2. **箭头链**：流程、因果关系用 → 连接，如 "定义 → 公式 → 推导 → 应用"
3. **高频考点标记**：🔥（高频考点）或 ⭐（必背考点）
4. **加粗关键词**：核心术语用 **加粗**
5. **层级清晰**：# ## ### 标题层级，每个 ## 下不超过 5 个 ###
6. **对比表格**：易混淆概念放在一起对比
7. **每个专题**配 1-2 道模拟练习题 + 答案解析
8. **文档末尾**加「核心对比表」和「考试自检清单」`

  const templateExtras: Record<string, string> = {
    quick_ref: `
速查手册模式：每个考点独立成表格（定义/公式/例题/易错点），标注 🔥 或 ⭐`,

    recite: `
背诵手册模式：开头加「全书脉络速览」表格，核心概念一句话定义，必背公式单独列表`,

    analysis: `
材料分析题模式：每个专题以「场景→理论→练习→答案拆解」结构组织，答案按分步给分`,

    custom: ``,
  }

  return `${formatRules}

${templateExtras[template] || ''}

用户需求：${instruction || '帮我整理成系统的复习文档'}

学习资料：
${matContent}

请直接返回 Markdown 文档内容。第一个 # 标题为文档标题。
只返回 Markdown，不要包含其他说明文字。`
}

export async function generateDocument(
  config: AIConfig,
  materials: { name: string; content: string }[],
  instruction: string,
  template: string = 'general'
): Promise<DocumentResult> {
  const prompt = buildDocumentPrompt(materials, instruction, template)
  const content = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.5, maxTokens: 8192 })
  if (!content) throw new Error('AI 返回内容为空')

  const titleMatch = content.match(/^#\s+(.+)/m)
  const title = titleMatch ? titleMatch[1].trim() : '复习文档'

  return { title, content }
}

export async function reviseDocument(
  config: AIConfig,
  originalContent: string,
  userMessage: string
): Promise<string> {
  const prompt = `你是一位专业的学习资料整理专家。用户对你生成的复习文档有修改意见，请根据用户要求修改文档。

当前文档内容：
${originalContent.substring(0, 12000)}

用户修改要求：${userMessage}

请返回修改后的完整 Markdown 文档。保持原有的高质量排版（表格优先、箭头链、高频考点标记等）。
只返回修改后的完整 Markdown，不要包含其他说明。`

  const content = await callAI(config, [{ role: 'user', content: prompt }], { temperature: 0.5, maxTokens: 8192 })
  if (!content) throw new Error('AI 返回内容为空')
  return content
}
