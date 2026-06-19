import { ipcMain } from 'electron'
import { SearchEngine, SearchSource } from '../services/searchEngine'
import { readCollection, writeCollection, appendItem, updateItem, deleteItem } from '../db/store'
import sourcesConfig from '../../config/searchSources.json'

let engine: SearchEngine | null = null

function initSearchEngine() {
  let sources = readCollection<SearchSource>('searchSources')
  if (sources.length === 0) {
    sources = sourcesConfig.sources as SearchSource[]
    writeCollection('searchSources', sources)
  }
  engine = new SearchEngine(sources)
}

export function reloadSearchEngine() {
  const sources = readCollection<SearchSource>('searchSources')
  if (engine) {
    engine.reload(sources)
  } else {
    engine = new SearchEngine(sources)
  }
}

function getEngine(): SearchEngine {
  if (!engine) initSearchEngine()
  return engine!
}

export function registerSearchHandlers() {
  initSearchEngine()

  ipcMain.handle('search:query', async (_event, keyword: string, sourceIds?: string[]) => {
    return getEngine().search(keyword, sourceIds)
  })

  ipcMain.handle('search:getSources', () => {
    return getEngine().getSources()
  })

  ipcMain.handle('search:getAllSources', () => {
    return readCollection<SearchSource>('searchSources')
  })

  ipcMain.handle('search:addSource', (_event, source: Omit<SearchSource, 'id'>) => {
    const newSource: SearchSource = {
      ...source,
      id: `src_${Date.now()}`,
    }
    appendItem('searchSources', newSource)
    reloadSearchEngine()
    return newSource
  })

  ipcMain.handle('search:updateSource', (_event, id: string, updates: Partial<SearchSource>) => {
    const updated = updateItem<SearchSource>('searchSources', id, updates)
    reloadSearchEngine()
    return updated
  })

  ipcMain.handle('search:deleteSource', (_event, id: string) => {
    deleteItem('searchSources', id)
    reloadSearchEngine()
    return { success: true }
  })

  ipcMain.handle('search:toggleSource', (_event, id: string) => {
    const sources = readCollection<SearchSource>('searchSources')
    const source = sources.find((s) => s.id === id)
    if (source) {
      updateItem<SearchSource>('searchSources', id, { enabled: !source.enabled } as Partial<SearchSource>)
      reloadSearchEngine()
      return { ...source, enabled: !source.enabled }
    }
    return null
  })
}
