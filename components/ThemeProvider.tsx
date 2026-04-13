'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
type Lang = 'es' | 'en'

interface ThemeCtx {
  theme: Theme
  lang: Lang
  setTheme: (t: Theme) => void
  setLang: (l: Lang) => void
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', lang: 'es', setTheme: () => {}, setLang: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [lang, setLangState] = useState<Lang>('es')

  useEffect(() => {
    const t = (localStorage.getItem('sl_theme') as Theme) || 'dark'
    const l = (localStorage.getItem('sl_lang') as Lang) || 'es'
    setThemeState(t)
    setLangState(l)
    // Landing always stays dark — don't apply theme there
    if (window.location.pathname !== '/') {
      document.documentElement.setAttribute('data-theme', t)
    }
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('sl_theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('sl_lang', l)
  }

  return <Ctx.Provider value={{ theme, lang, setTheme, setLang }}>{children}</Ctx.Provider>
}

export function useTheme() { return useContext(Ctx) }
