import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { isFirebaseConfigured, onForegroundMessage } from './firebase'
import BottomNav from './components/BottomNav'
import BabySetup from './pages/BabySetup'
import RoomSetup from './pages/RoomSetup'
import Home from './pages/Home'
import Timeline from './pages/Timeline'
import Stats from './pages/Stats'
import JournalPage from './pages/JournalPage'
import SettingsPage from './pages/SettingsPage'

// 성별 기반 테마 색상
const THEMES = {
  MALE: {
    '--primary': '#4A90E2', '--primary-dark': '#2E7BD6',
    '--primary-light': '#A8CCFF', '--bg': '#F0F7FF', '--border': '#C8E0FF',
  },
  FEMALE: {
    '--primary': '#FF6B9D', '--primary-dark': '#E0507F',
    '--primary-light': '#FFB3CE', '--bg': '#FFF5F8', '--border': '#FFE0EC',
  },
  UNKNOWN: {
    '--primary': '#7B5EA7', '--primary-dark': '#6347A0',
    '--primary-light': '#C4ADFF', '--bg': '#F8F5FF', '--border': '#E4D8FF',
  },
}

const PAGE_TITLES = {
  '/': 'BabyTime', '/timeline': '타임라인',
  '/stats': '통계', '/journal': '육아일지', '/settings': '설정',
}

function AppShell() {
  const { baby, roomId } = useApp()
  const { pathname } = useLocation()

  // 포그라운드 FCM 메시지를 브라우저 알림으로 표시
  useEffect(() => {
    const unsub = onForegroundMessage(payload => {
      const { title, body } = payload.notification || {}
      if (title && Notification.permission === 'granted') {
        try { new Notification(title, { body, icon: '/Baby/icon-192.png' }) } catch {}
      }
    })
    return unsub
  }, [])

  // 1단계: 아기 정보 미설정
  if (!baby) return <BabySetup />

  // 2단계: 공유 방 설정 (Firebase 설정된 경우에만, 한 번도 선택 안 했을 때)
  const skipSharing = localStorage.getItem('bt_skip_sharing') === 'true'
  if (isFirebaseConfigured && !roomId && !skipSharing) {
    return (
      <RoomSetup
        onSkip={() => {
          localStorage.setItem('bt_skip_sharing', 'true')
          window.location.reload()
        }}
      />
    )
  }

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
          <Route path="/"         element={<Home />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/stats"    element={<Stats />} />
          <Route path="/journal"  element={<JournalPage />} />
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
