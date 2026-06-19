import { create } from 'zustand'

interface AIConfig {
  provider: string
  hasApiKey: boolean
}

interface AIState {
  config: AIConfig
  setConfig: (config: AIConfig) => void
  generateQuestions: (params: {
    content: string
    type: string
    difficulty: string
    count: number
  }) => Promise<{
    id: string
    content: string
    options: { value: string; label: string }[]
    answer: string
    explanation: string
    type: string
  }[]>
}

export const useAIStore = create<AIState>((set) => ({
  config: { provider: 'deepseek', hasApiKey: false },

  setConfig: (config) => set({ config }),

  generateQuestions: async (params) => {
    const result = await window.electron?.ai.generateQuestions(params)
    if (!result) throw new Error('AI 调用失败')
    return result
  },
}))
