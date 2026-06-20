import { ipcMain } from 'electron'
import { initContext, readContextFile, writeContextFile, listContextFiles, appendHistory, readHistory, clearHistory } from '../services/projectContext'

export function registerContextHandlers() {
  ipcMain.handle('context:init', (_event, subjectId: string) => {
    initContext(subjectId)
  })

  ipcMain.handle('context:read', (_event, subjectId: string, filename: string) => {
    return readContextFile(subjectId, filename)
  })

  ipcMain.handle('context:write', (_event, subjectId: string, filename: string, content: string) => {
    writeContextFile(subjectId, filename, content)
  })

  ipcMain.handle('context:list', (_event, subjectId: string) => {
    return listContextFiles(subjectId)
  })

  ipcMain.handle('context:appendHistory', (_event, subjectId: string, historyType: string, entry: { role: string; content: string; timestamp: string }) => {
    appendHistory(subjectId, historyType, entry)
  })

  ipcMain.handle('context:readHistory', (_event, subjectId: string, historyType: string, limit?: number) => {
    return readHistory(subjectId, historyType, limit)
  })

  ipcMain.handle('context:clearHistory', (_event, subjectId: string, historyType: string) => {
    clearHistory(subjectId, historyType)
  })
}
