import { useState, useEffect } from 'react'
import ConversationPanel from '../Common/ConversationPanel'
import type { Material } from '../Common/MaterialPicker'

interface ChatPanelProps {
  subjectId: string
}

const ChatPanel = ({ subjectId }: ChatPanelProps) => {
  const [contextPrompt, setContextPrompt] = useState('')

  useEffect(() => {
    loadContext()
  }, [subjectId])

  const loadContext = async () => {
    let systemContext = ''

    const wikiDir = await window.electron?.wiki.getDir(subjectId)
    if (wikiDir) {
      const wikiContent = await window.electron?.wiki.readAllPages(subjectId)
      if (wikiContent) {
        systemContext = '以下是该学科的 Wiki 知识库内容，请基于这些内容回答：\n\n' + wikiContent.substring(0, 12000)
      }
    }

    if (!systemContext) {
      const data = await window.electron?.db.list('materials')
      const all = (data as Material[]) || []
      const subjectMaterials = all.filter((m) => (m as Record<string, unknown>).subjectId === subjectId)
      if (subjectMaterials.length > 0) {
        systemContext = '以下是与用户问题相关的学习资料，请优先基于这些资料回答：\n\n'
        for (const mat of subjectMaterials.slice(0, 5)) {
          if (mat.content && mat.content.length > 10) {
            const snippet = mat.content.substring(0, 3000)
            systemContext += `【${mat.name}】\n${snippet}\n\n---\n\n`
          }
        }
      }
    }

    if (systemContext) {
      setContextPrompt(systemContext + '\n用户问题：')
    }
  }

  return (
    <div className="h-full">
      <ConversationPanel
        subjectId={subjectId}
        feature="chat"
        contextPrompt={contextPrompt}
        placeholder="向 AI 提问，它会自动参考你的资料库回答..."
      />
    </div>
  )
}

export default ChatPanel
