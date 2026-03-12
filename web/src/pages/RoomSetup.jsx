import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { isFirebaseConfigured } from '../firebase'

export default function RoomSetup({ onSkip }) {
  const { createRoom, joinRoom } = useApp()
  const [mode,          setMode]          = useState(null) // null | 'create' | 'join'
  const [joinCode,      setJoinCode]      = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const code = await createRoom()
      setGeneratedCode(code)
      setMode('created')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    const code = joinCode.toUpperCase().trim()
    if (code.length !== 6) { setError('6자리 코드를 입력해주세요'); return }
    setLoading(true)
    setError('')
    try {
      await joinRoom(code)
      // joinRoom이 성공하면 App.jsx에서 roomId가 설정돼 자동으로 메인으로 이동
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(generatedCode).catch(() => {})
  }

  // Firebase 미설정 시 안내만 표시
  if (!isFirebaseConfigured) {
    return (
      <div className="setup-page">
        <div className="setup-emoji">☁️</div>
        <h1 className="setup-title">가족 공유</h1>
        <p className="setup-subtitle">
          공유 기능을 사용하려면<br />Firebase 설정이 필요합니다
        </p>
        <div className="card" style={{ width: '100%', marginBottom: 16, textAlign: 'left' }}>
          <div className="card-title">설정 방법</div>
          <ol style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-light)', lineHeight: 2 }}>
            <li>console.firebase.google.com 접속</li>
            <li>새 프로젝트 생성</li>
            <li>Firestore Database 활성화</li>
            <li>웹 앱 추가 → config 복사</li>
            <li>web/.env 파일에 값 입력</li>
            <li>GitHub Actions에 시크릿 추가</li>
          </ol>
        </div>
        <button className="btn-primary" onClick={onSkip}>
          나중에 설정할게요 →
        </button>
      </div>
    )
  }

  // 방 생성 완료 화면
  if (mode === 'created') {
    return (
      <div className="setup-page">
        <div className="setup-emoji">🎉</div>
        <h1 className="setup-title">방이 만들어졌어요!</h1>
        <p className="setup-subtitle">이 코드를 파트너에게 공유하세요</p>

        <div style={{
          background: 'var(--primary)',
          color: 'white',
          borderRadius: 20,
          padding: '24px 32px',
          fontSize: 40,
          fontWeight: 900,
          letterSpacing: 8,
          marginBottom: 16,
          cursor: 'pointer',
          userSelect: 'all',
        }} onClick={copyCode}>
          {generatedCode}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 24 }}>
          클릭하면 복사돼요
        </p>

        <div className="card" style={{ width: '100%', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.8 }}>
            📱 파트너가 앱을 열고 <strong>코드 입력</strong>을 선택한 뒤<br />
            위 코드를 입력하면 기록이 실시간으로 공유돼요!
          </p>
        </div>

        <button className="btn-primary" onClick={onSkip}>
          시작하기 →
        </button>
        <button
          className="btn-secondary"
          onClick={copyCode}
          style={{ marginTop: 8 }}
        >
          📋 코드 복사하기
        </button>
      </div>
    )
  }

  // 초기 선택 화면
  if (!mode) {
    return (
      <div className="setup-page">
        <div className="setup-emoji">👨‍👩‍👧</div>
        <h1 className="setup-title">가족과 함께해요</h1>
        <p className="setup-subtitle">엄마·아빠가 실시간으로 기록을 공유할 수 있어요</p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <button
            className="btn-primary"
            onClick={() => { setMode('create'); handleCreate() }}
            disabled={loading}
          >
            {loading ? '방 만드는 중...' : '🏠 방 만들기 (처음 시작)'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setMode('join')}
          >
            🔑 코드 입력 (파트너 방 참여)
          </button>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-light)',
              fontSize: 14,
              cursor: 'pointer',
              padding: '12px',
              textDecoration: 'underline',
            }}
            onClick={onSkip}
          >
            혼자 쓸게요 (나중에 공유 설정 가능)
          </button>
        </div>

        <div className="card" style={{ width: '100%', textAlign: 'left' }}>
          <div className="card-title">공유 기능 안내</div>
          <div style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.9 }}>
            ✅ 기록 추가 시 파트너 기기에 즉시 반영<br />
            ✅ 앱이 열려있으면 알림 수신<br />
            ✅ 오프라인에서도 기록 가능 (나중에 동기화)
          </div>
        </div>

        {error && (
          <div style={{ color: 'red', fontSize: 13, marginTop: 12 }}>{error}</div>
        )}
      </div>
    )
  }

  // 코드 입력 화면
  return (
    <div className="setup-page">
      <div className="setup-emoji">🔑</div>
      <h1 className="setup-title">코드 입력</h1>
      <p className="setup-subtitle">파트너에게 받은 6자리 코드를 입력하세요</p>

      <div style={{ width: '100%' }}>
        <input
          type="text"
          className="form-input"
          placeholder="ABC123"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
          style={{
            fontSize: 28,
            textAlign: 'center',
            letterSpacing: 6,
            fontWeight: 700,
            marginBottom: 12,
          }}
          maxLength={6}
          autoFocus
          autoCapitalize="characters"
        />

        {error && (
          <div style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button
          className="btn-primary"
          onClick={handleJoin}
          disabled={loading || joinCode.length !== 6}
          style={{ opacity: joinCode.length === 6 ? 1 : 0.5 }}
        >
          {loading ? '연결 중...' : '참여하기'}
        </button>
        <button className="btn-secondary" onClick={() => { setMode(null); setError('') }}>
          뒤로
        </button>
      </div>
    </div>
  )
}
