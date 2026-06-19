import { ipcMain } from 'electron'
import { getTerminalContext } from './context'

// Global API for terminal access
export function registerTerminalGlobalApi() {
  const context = getTerminalContext()

  // Terminal can request app context
  ipcMain.handle('terminal:getContext', () => {
    return context
  })

  // Terminal can list subjects
  ipcMain.handle('terminal:listSubjects', async () => {
    const { default: store } = await import('../db/store')
    return store.list('subjects')
  })

  // Terminal can list materials
  ipcMain.handle('terminal:listMaterials', async (event, subjectId?: string) => {
    const { default: store } = await import('../db/store')
    const materials = store.list('materials')
    if (subjectId) {
      return materials.filter((m: any) => m.subjectId === subjectId)
    }
    return materials
  })

  // Terminal can read material content
  ipcMain.handle('terminal:readMaterial', async (event, materialId: string) => {
    const { default: store } = await import('../db/store')
    return store.get('materials', materialId)
  })

  // Terminal can trigger AI chat
  ipcMain.handle('terminal:aiChat', async (event, message: string) => {
    const { default: store } = await import('../db/store')
    const config = store.list('config').find((c: any) => c.id === 'aiConfig')
    if (!config?.apiKey) {
      return '错误: 请先在设置中配置 API Key'
    }

    // Import and use AI handler
    const { handleChat } = await import('../ipc/aiHandlers')
    return await handleChat(config, message)
  })

  // Terminal can generate questions
  ipcMain.handle('terminal:generateQuestions', async (event, params: any) => {
    const { default: store } = await import('../db/store')
    const config = store.list('config').find((c: any) => c.id === 'aiConfig')
    if (!config?.apiKey) {
      return { error: '请先在设置中配置 API Key' }
    }

    const { handleGenerateQuestions } = await import('../ipc/aiHandlers')
    return await handleGenerateQuestions(config, params)
  })

  // Terminal can search materials
  ipcMain.handle('terminal:search', async (event, query: string) => {
    const { default: store } = await import('../db/store')
    const sources = store.list('searchSources')
    // Simple search implementation
    const results: any[] = []
    for (const source of sources) {
      if (source.enabled) {
        results.push({
          source: source.name,
          query,
          url: `${source.searchUrl}${encodeURIComponent(query)}`,
        })
      }
    }
    return results
  })

  // Terminal can get wrong questions
  ipcMain.handle('terminal:getWrongQuestions', async (event, subjectId?: string) => {
    const { default: store } = await import('../db/store')
    const wrong = store.list('wrongBook')
    if (subjectId) {
      return wrong.filter((w: any) => w.subjectId === subjectId)
    }
    return wrong
  })

  // Terminal can get quiz history
  ipcMain.handle('terminal:getQuizHistory', async (event, subjectId?: string) => {
    const { default: store } = await import('../db/store')
    const history = store.list('quizHistory')
    if (subjectId) {
      return history.filter((h: any) => h.subjectId === subjectId)
    }
    return history
  })

  // Terminal can export data
  ipcMain.handle('terminal:exportData', async (event, type: string) => {
    const { default: store } = await import('../db/store')
    switch (type) {
      case 'subjects':
        return store.list('subjects')
      case 'materials':
        return store.list('materials')
      case 'wrong':
        return store.list('wrongBook')
      case 'history':
        return store.list('quizHistory')
      case 'all':
        return {
          subjects: store.list('subjects'),
          materials: store.list('materials'),
          wrongBook: store.list('wrongBook'),
          quizHistory: store.list('quizHistory'),
        }
      default:
        return { error: '未知的导出类型' }
    }
  })

  // Terminal can write to conversations
  ipcMain.handle('terminal:addConversation', async (event, message: any) => {
    const { default: store } = await import('../db/store')
    store.add('conversations', message)
    return { success: true }
  })

  // Terminal can get conversations
  ipcMain.handle('terminal:getConversations', async (event, subjectId?: string) => {
    const { default: store } = await import('../db/store')
    const conversations = store.list('conversations')
    if (subjectId) {
      return conversations.filter((c: any) => c.subjectId === subjectId)
    }
    return conversations
  })
}
