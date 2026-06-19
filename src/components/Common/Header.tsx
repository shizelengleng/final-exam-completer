import { useState, useRef, useEffect } from 'react'
import { MinusOutlined, FullscreenOutlined, CloseOutlined, SettingOutlined, CodeOutlined, BgColorsOutlined } from '@ant-design/icons'
import SettingsModal from './SettingsModal'
import { useTheme } from '../../contexts/ThemeContext'

interface HeaderProps {
  currentSubject?: Subject | null
  showTerminal: boolean
  onToggleTerminal: () => void
}

const Header = ({ currentSubject, showTerminal, onToggleTerminal }: HeaderProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const { theme, themes, setTheme } = useTheme()
  const themePickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleWindowControl = (action: string) => {
    window.electron?.windowControls?.[action as 'minimize' | 'maximize' | 'close']()
  }

  return (
    <>
      <header className="h-12 border-b flex items-center justify-between px-4 select-none"
        style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border, WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          {currentSubject && (
            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.colors.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentSubject.color }} />
              {currentSubject.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={onToggleTerminal}
            className={`p-2 rounded transition-colors ${
              showTerminal
                ? 'bg-gray-800 text-green-400'
                : 'hover:bg-gray-100'
            }`}
            style={{ color: showTerminal ? undefined : theme.colors.textSecondary }}
            title="终端 (Ctrl+`)"
          >
            <CodeOutlined />
          </button>
          <div className="relative" ref={themePickerRef}>
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-2 hover:bg-gray-100 rounded"
              style={{ color: theme.colors.primary }}
              title="主题配色"
            >
              <BgColorsOutlined />
            </button>
            {showThemePicker && (
              <div className="absolute top-full right-0 mt-1 rounded-lg shadow-xl py-2 z-50 w-40"
                style={{ backgroundColor: theme.colors.bgCard, border: `1px solid ${theme.colors.border}` }}>
                <p className="px-3 py-1 text-xs font-medium" style={{ color: theme.colors.textSecondary }}>主题配色</p>
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setShowThemePicker(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{
                      backgroundColor: theme.id === t.id ? `${t.colors.primary}15` : undefined,
                      color: theme.id === t.id ? t.colors.primary : theme.colors.text,
                      fontWeight: theme.id === t.id ? 500 : 400,
                    }}
                  >
                    <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: t.colors.primary }} />
                    <span className="flex-1 text-left">{t.name}</span>
                    {theme.id === t.id && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-gray-100 rounded"
            style={{ color: theme.colors.textSecondary }}
          >
            <SettingOutlined />
          </button>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: theme.colors.border }} />
          <button
            onClick={() => handleWindowControl('minimize')}
            className="p-2 hover:bg-gray-100 rounded"
            style={{ color: theme.colors.textSecondary }}
          >
            <MinusOutlined />
          </button>
          <button
            onClick={() => handleWindowControl('maximize')}
            className="p-2 hover:bg-gray-100 rounded"
            style={{ color: theme.colors.textSecondary }}
          >
            <FullscreenOutlined />
          </button>
          <button
            onClick={() => handleWindowControl('close')}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded"
            style={{ color: theme.colors.textSecondary }}
          >
            <CloseOutlined />
          </button>
        </div>
      </header>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default Header
