import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import BabySetup from './pages/BabySetup'
import Home from './pages/Home'
import Timeline from './pages/Timeline'
import Stats from './pages/Stats'
import JournalPage from './pages/JournalPage'
import SettingsPage from './pages/SettingsPage'

// Gender-based theme colors
const THEMES = {
  MALE: {
    '--primary': '#4A90E2',
    '--primary-dark': '#2E7BD6',
    '--primary-light': '#A8CCFF',
    '--bg': '#F0F7FF',
    '--border': '#C8E0FF',
  },
  FEMALE: {
    '--primary': '#FF6B9D',
    '--primary-dark': '#E0507F',
    '--primary-light': '#FFB3CE',
    '--bg': '#FFF5F8',
    '--border': '#FFE0EC',
  },
  UNKNOWN: {
    '--primary': '#7B5EA7',
    '--primary-dark': '#6347A0',
    '--primary-light': '#C4ADFF',
    '--bg': '#F8F5FF',
    '--border': '#E4D8FF',
  },
}

const PAGE_TITLES = {
  '/': 'BabyTime',
  '/timeline': '타임라인',
  '/stats': '통계',
  '/journal': '육아일지',
  '/settings': '설정',
}

function AppShell() {
  const { baby } = useApp()
  const { pathname } = useLocation()

  if (!baby) return <BabySetup />

  const theme = THEMES[baby.gender] || THEMES.UNKNOWN
  const title = PAGE_TITLES[pathname] || 'BabyTime'

  return (
    <div className="app-shell" style={theme}>
      <header className="header">
        <div>
          <div className="header-title">🍼 {title}</div>
          {pathname === '/' && (
            <div className="header-subtitle">{baby.name}의 육아 기록</div>
          )}
        </div>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </AppProvider>
  )
}
