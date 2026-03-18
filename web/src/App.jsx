import { useEffect, useState } from 'react'
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

// 아기 선택 모달
function BabySelectorModal({ onClose }) {
  const { babies, activeBabyId, setActiveBaby } = useApp()
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">👶 아기 선택</div>
        {babies.map(b => (
          <button
            key={b.id}
            onClick={() => { setActiveBaby(b.id); onClose() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px',
              background: b.id === activeBabyId ? 'var(--bg)' : 'white',
              border: `2px solid ${b.id === activeBabyId ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 14, cursor: 'pointer', marginBottom: 8, textAlign: 'left',
            }}
          >
            {b.photo
              ? <img src={b.photo} alt={b.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <span style={{ fontSize: 32, width: 44, textAlign: 'center' }}>
                  {b.gender === 'MALE' ? '👦' : b.gender === 'FEMALE' ? '👧' : '🍼'}
                </span>
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{b.name}</div>
              {b.birthDate && <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{b.birthDate}</div>}
            </div>
            {b.id === activeBabyId && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
          </button>
        ))}
        <button className="btn-secondary" onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

function AppShell() {
  const { baby, babies, roomId, joinRoom } = useApp()
  const { pathname } = useLocation()
  const [showBabySelector, setShowBabySelector] = useState(false)

  // 성별에 따라 CSS 변수를 document root에도 적용 (전역 테마)
  useEffect(() => {
    const theme = THEMES[baby?.gender] || THEMES.UNKNOWN
    Object.entries(theme).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v)
    })
  }, [baby?.gender])

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

  // URL 파라미터에서 pending join 처리 (이메일 링크 클릭 시)
  useEffect(() => {
    const pending = localStorage.getItem('bt_pending_join')
    if (pending && isFirebaseConfigured && !roomId) {
      localStorage.removeItem('bt_pending_join')
      joinRoom(pending).catch(e => console.warn('Auto-join failed:', e.message))
    }
  }, [baby, roomId, joinRoom])

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
        <div style={{ flex: 1 }}>
          <div className="header-title">🍼 {title}</div>
          {pathname === '/' && (
            <div className="header-subtitle">{baby.name}의 육아 기록</div>
          )}
        </div>
        {/* 아기 선택 버튼 (복수 아기 등록 시) */}
        {babies.length > 1 && (
          <button
            onClick={() => setShowBabySelector(true)}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
              borderRadius: 12, padding: '6px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {baby.photo
              ? <img src={baby.photo} alt={baby.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22 }}>
                  {baby.gender === 'MALE' ? '👦' : baby.gender === 'FEMALE' ? '👧' : '🍼'}
                </span>
            }
            <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>▾</span>
          </button>
        )}
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

      {showBabySelector && <BabySelectorModal onClose={() => setShowBabySelector(false)} />}
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
