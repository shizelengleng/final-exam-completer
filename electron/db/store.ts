import { app } from 'electron'
import fs from 'fs'
import path from 'path'

let dataDir: string | null = null

function getDataDir(): string {
  if (!dataDir) {
    dataDir = path.join(app.getPath('userData'), 'data')
  }
  return dataDir
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getFilePath(collection: string): string {
  const dir = getDataDir()
  ensureDir(dir)
  return path.join(dir, `${collection}.json`)
}

export function readCollection<T>(collection: string): T[] {
  const filePath = getFilePath(collection)
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T[]
}

export function writeCollection<T>(collection: string, data: T[]): void {
  const filePath = getFilePath(collection)
  ensureDir(getDataDir())
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function appendItem<T extends { id: string }>(collection: string, item: T): T {
  const items = readCollection<T>(collection)
  items.unshift(item)
  writeCollection(collection, items)
  return item
}

export function updateItem<T extends { id: string }>(
  collection: string,
  id: string,
  updates: Partial<T>
): T | null {
  const items = readCollection<T>(collection)
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null
  items[index] = { ...items[index], ...updates }
  writeCollection(collection, items)
  return items[index]
}

export function deleteItem<T extends { id: string }>(collection: string, id: string): boolean {
  const items = readCollection<T>(collection)
  const filtered = items.filter((item) => item.id !== id)
  if (filtered.length === items.length) return false
  writeCollection(collection, filtered)
  return true
}

export function getItem<T extends { id: string }>(collection: string, id: string): T | null {
  const items = readCollection<T>(collection)
  return items.find((item) => item.id === id) || null
}

export function migrateIfNeeded() {
  const dir = getDataDir()
  const subjectsPath = path.join(dir, 'subjects.json')
  const categoriesPath = path.join(dir, 'categories.json')

  // If subjects.json already exists, no migration needed
  if (fs.existsSync(subjectsPath)) return

  // If categories.json exists, rename it to subjects.json
  if (fs.existsSync(categoriesPath)) {
    fs.renameSync(categoriesPath, subjectsPath)
  }
}
