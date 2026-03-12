import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import BabySetup from './pages/BabySetup'
import Home from './pages/Home'
import Timeline from './pages/Timeline'
import Stats from './pages/Stats'
import MemoPage from './pages/MemoPage'

const PAGE_TITLES = {
  '/': 'BabyTime',
  '/timeline': '타임라인',
  '/stats': '통계',
  '/memo': '메모',
}

function AppShell() {
  const { baby } = useApp()
  const { pathname } = useLocation()

  if (!baby) return <BabySetup />

  const title = PAGE_TITLES[pathname] || 'BabyTime'

  return (
    <div className="app-shell">
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
          <Route path="/memo" element={<MemoPage />} />
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
