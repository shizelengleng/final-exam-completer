import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// Terminal context for the app
export interface TerminalContext {
  appName: string
  version: string
  userDataPath: string
  uploadsPath: string
  subjectsPath: string
  materialsPath: string
  skills: string[]
  dataSources: string[]
  capabilities: string[]
}

// Get terminal context
export function getTerminalContext(): TerminalContext {
  const userDataPath = app.getPath('userData')
  const uploadsPath = path.join(userDataPath, 'uploads')

  return {
    appName: '期末补完计划',
    version: '0.1.0',
    userDataPath,
    uploadsPath,
    subjectsPath: path.join(userDataPath, 'subjects.json'),
    materialsPath: uploadsPath,
    skills: [
      'ai-generate-questions - AI 出题',
      'ai-chat - AI 答疑',
      'ai-generate-graph - 知识图谱生成',
      'ai-categorize - 资料分类',
      'ai-generate-document - 文档生成',
      'search-materials - 搜集资料',
      'manage-sources - 管理数据源',
    ],
    dataSources: [
      '百度文库 - courseware',
      '知乎 - qa',
      'B站 - video',
      '百度学术 - academic',
      'Z-Library - ebook',
      'GitHub - code',
      'CSDN - tech',
    ],
    capabilities: [
      '读取/写入资料文件',
      '管理学科和科目',
      '生成练习题和考试',
      '分析薄弱知识点',
      '生成知识图谱',
      '导出文档 (Markdown/Word)',
      'AI 对话和答疑',
    ],
  }
}

// Generate context script for terminal
export function generateContextScript(): string {
  const ctx = getTerminalContext()

  return `
# ${ctx.appName} v${ctx.version} - 终端上下文
# 工作目录: ${ctx.uploadsPath}

# 可用 Skills:
${ctx.skills.map(s => `#   - ${s}`).join('\n')}

# 数据源:
${ctx.dataSources.map(s => `#   - ${s}`).join('\n')}

# 功能:
${ctx.capabilities.map(c => `#   - ${c}`).join('\n')}

# 路径:
export APP_NAME="${ctx.appName}"
export APP_VERSION="${ctx.version}"
export USER_DATA="${ctx.userDataPath}"
export UPLOADS_DIR="${ctx.uploadsPath}"
export SUBJECTS_FILE="${ctx.subjectsPath}"
`
}

// Write context file for terminal
export function writeContextFile(): string {
  const ctx = getTerminalContext()
  const contextPath = path.join(ctx.uploadsPath, '.terminal-context')

  if (!fs.existsSync(ctx.uploadsPath)) {
    fs.mkdirSync(ctx.uploadsPath, { recursive: true })
  }

  const content = generateContextScript()
  fs.writeFileSync(contextPath, content, 'utf-8')

  return contextPath
}
