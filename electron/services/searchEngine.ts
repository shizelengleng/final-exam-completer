import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

export interface SearchSource {
  id: string
  name: string
  type: string
  searchUrl: string
  enabled: boolean
  priority: number
}

export interface SearchResult {
  id: string
  title: string
  source: string
  sourceId: string
  url: string
  type: string
  summary: string
  score: number
}

// 模拟搜索结果生成（真实场景应调用各平台 API 或爬取）
function generateMockResults(keyword: string, source: SearchSource): SearchResult[] {
  const templates: Record<string, string[]> = {
    courseware: [
      `${keyword} 期末复习课件（完整版）`,
      `${keyword} 重点知识点总结`,
      `${keyword} 期中/期末考试复习资料`,
    ],
    qa: [
      `${keyword} 期末怎么复习？高分学长经验分享`,
      `${keyword} 考试重点有哪些？`,
      `${keyword} 哪些知识点必考？`,
    ],
    video: [
      `${keyword} 期末复习 串讲视频`,
      `${keyword} 重点章节精讲`,
      `${keyword} 考前冲刺课程`,
    ],
    academic: [
      `${keyword} 教学改革研究`,
      `${keyword} 课程体系建设`,
      `${keyword} 最新研究论文 PDF`,
    ],
    ebook: [
      `${keyword} 电子书 PDF 下载`,
      `${keyword} 教材电子版 免费下载`,
      `${keyword} 经典教材 网盘资源`,
    ],
    'pan-search': [
      `${keyword} 百度网盘资源 搜索`,
      `${keyword} 网盘分享 高清 PDF`,
      `${keyword} 学习资料网盘合集`,
    ],
    code: [
      `${keyword} GitHub 实战项目 开源`,
      `${keyword} 高星开源项目 推荐`,
      `${keyword} 学习资源 awesome ${keyword}`,
    ],
    tech: [
      `${keyword} 技术博客 详解`,
      `${keyword} 最佳实践 CSDN`,
      `${keyword} 面试题总结 ${keyword}`,
    ],
  }

  const items = templates[source.type] || templates.courseware
  return items.map((title, i) => ({
    id: `${source.id}_${Date.now()}_${i}`,
    title,
    source: source.name,
    sourceId: source.id,
    url: `${source.searchUrl}${encodeURIComponent(keyword)}`,
    type: source.type,
    summary: `来自${source.name}的优质${keyword}复习资料，点击查看详情...`,
    score: Math.round((0.9 - i * 0.1) * 100) / 100,
  }))
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  courseware: '课件',
  qa: '问答',
  video: '视频',
  academic: '学术',
  ebook: '电子书',
  'pan-search': '网盘',
  code: '代码',
  tech: '技术',
}

export class SearchEngine {
  private sources: SearchSource[] = []
  private allSources: SearchSource[] = []

  constructor(sources: SearchSource[]) {
    this.allSources = sources
    this.sources = sources.filter((s) => s.enabled).sort((a, b) => a.priority - b.priority)
  }

  reload(sources: SearchSource[]) {
    this.allSources = sources
    this.sources = sources.filter((s) => s.enabled).sort((a, b) => a.priority - b.priority)
  }

  getAllSources(): SearchSource[] {
    return this.allSources
  }

  async search(keyword: string, sourceIds?: string[]): Promise<SearchResult[]> {
    const targetSources = sourceIds
      ? this.sources.filter((s) => sourceIds.includes(s.id))
      : this.sources

    const allResults: SearchResult[] = []

    for (const source of targetSources) {
      try {
        const results = await this.searchSource(source, keyword)
        allResults.push(...results)
      } catch (err) {
        console.error(`搜索 ${source.name} 失败:`, err)
      }
    }

    // 按相关度排序
    return allResults.sort((a, b) => b.score - a.score)
  }

  private async searchSource(source: SearchSource, keyword: string): Promise<SearchResult[]> {
    // 先尝试真实请求，失败则使用模拟数据
    try {
      const response = await fetch(`${source.searchUrl}${encodeURIComponent(keyword)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 5000,
      } as Parameters<typeof fetch>[1])

      if (response.ok) {
        const html = await response.text()
        return this.parseHtml(html, source, keyword)
      }
    } catch {
      // 网络请求失败，使用模拟数据
    }

    return generateMockResults(keyword, source)
  }

  private parseHtml(html: string, source: SearchSource, keyword: string): SearchResult[] {
    const $ = cheerio.load(html)
    const results: SearchResult[] = []

    // 通用提取逻辑：查找链接和文本
    $('a').each((i, el) => {
      if (i >= 5) return false // 每个源最多5条

      const text = $(el).text().trim()
      const href = $(el).attr('href') || ''

      if (text.length > 5 && text.includes(keyword.substring(0, 2))) {
        results.push({
          id: `${source.id}_${Date.now()}_${i}`,
          title: text.substring(0, 100),
          source: source.name,
          sourceId: source.id,
          url: href.startsWith('http') ? href : `${source.searchUrl}${encodeURIComponent(keyword)}`,
          type: source.type,
          summary: `来自${source.name}的资料`,
          score: Math.round((0.8 - i * 0.05) * 100) / 100,
        })
      }
    })

    if (results.length === 0) {
      return generateMockResults(keyword, source)
    }

    return results
  }

  getSources(): SearchSource[] {
    return this.sources
  }
}
