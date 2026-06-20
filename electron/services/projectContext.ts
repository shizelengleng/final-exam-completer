import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

function getSubjectsDir(): string {
  const dir = path.join(app.getPath('userData'), 'data', 'subjects')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getContextDir(subjectId: string): string {
  const dir = path.join(getSubjectsDir(), subjectId, '.exam-context')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
}

export function initContext(subjectId: string): void {
  const ctxDir = getContextDir(subjectId)
  ensureDir(path.join(ctxDir, 'prompts'))
  ensureDir(path.join(ctxDir, 'history'))

  const claudePath = path.join(ctxDir, 'CLAUDE.md')
  if (!fs.existsSync(claudePath)) {
    fs.writeFileSync(claudePath, `# 学科上下文\n\n请在此文件中描述本学科的学习目标、重点内容和考试范围。\n`, 'utf-8')
  }

  const configPath = path.join(ctxDir, 'config.json')
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ subjectId, createdAt: new Date().toISOString() }, null, 2), 'utf-8')
  }
}

export function readContextFile(subjectId: string, filename: string): string | null {
  const filePath = path.join(getContextDir(subjectId), filename)
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, 'utf-8')
}

export function writeContextFile(subjectId: string, filename: string, content: string): void {
  const filePath = path.join(getContextDir(subjectId), filename)
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf-8')
}

export function listContextFiles(subjectId: string): string[] {
  const ctxDir = getContextDir(subjectId)
  if (!fs.existsSync(ctxDir)) return []
  const result: string[] = []
  const walk = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), rel)
      } else {
        result.push(rel)
      }
    }
  }
  walk(ctxDir, '')
  return result
}

export function appendHistory(subjectId: string, historyType: string, entry: { role: string; content: string; timestamp: string }): void {
  const historyDir = path.join(getContextDir(subjectId), 'history')
  ensureDir(historyDir)
  const filePath = path.join(historyDir, `${historyType}.jsonl`)
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf-8')
}

export function readHistory(subjectId: string, historyType: string, limit = 50): { role: string; content: string; timestamp: string }[] {
  const filePath = path.join(getContextDir(subjectId), 'history', `${historyType}.jsonl`)
  if (!fs.existsSync(filePath)) return []
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
  return lines.slice(-limit).map((line) => JSON.parse(line))
}

export function clearHistory(subjectId: string, historyType: string): void {
  const filePath = path.join(getContextDir(subjectId), 'history', `${historyType}.jsonl`)
  if (fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf-8')
}
