import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { isFirebaseConfigured, requestPushPermission } from '../firebase'

const GENDERS = [
  { value: 'MALE',    icon: '👦', label: '남자아이', desc: '파란색 테마' },
  { value: 'FEMALE',  icon: '👧', label: '여자아이', desc: '분홍색 테마' },
  { value: 'UNKNOWN', icon: '🍼', label: '비공개',   desc: '보라색 테마' },
]

// ─── 공통 UI 컴포넌트 ────────────────────────────────────────────────────────
function SettingRow({ icon, label, desc, onClick, rightEl }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        gap: 14, padding: '14px 16px', background: 'white',
        border: 'none', cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left', transition: 'background 0.1s',
      }}
      onMouseDown={e  => onClick && (e.currentTarget.style.background = 'var(--bg)')}
      onMouseUp={e    => (e.currentTarget.style.background = 'white')}
      onTouchStart={e => onClick && (e.currentTarget.style.background = 'var(--bg)')}
      onTouchEnd={e   => (e.currentTarget.style.background = 'white')}
    >
      <span style={{ fontSize: 22, width: 32, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{desc}</div>}
      </div>
      {rightEl ?? (onClick
        ? <span style={{ fontSize: 18, color: 'var(--text-light)' }}>›</span>
        : null
      )}
    </button>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ padding: '20px 4px 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
      {title}
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', marginLeft: 62 }} />
}

// ─── 동기화 상태 배지 ────────────────────────────────────────────────────────
function SyncBadge({ status, isOnline }) {
  const map = {
    synced:  { icon: '✅', text: '동기화됨',   color: '#4CAF87' },
    syncing: { icon: '🔄', text: '동기화 중',  color: 'var(--primary)' },
    error:   { icon: '⚠️', text: '오류',       color: '#FF6B6B' },
    local:   { icon: '💾', text: '로컬 전용',  color: 'var(--text-light)' },
  }
  const s = map[status] || map.local
  return (
    <span style={{ fontSize: 11, color: s.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
      {s.icon} {isOnline ? s.text : '오프라인'}
    </span>
  )
}

// ─── Firebase 설정 모달 ──────────────────────────────────────────────────────
function FirebaseSharingModal({ onClose }) {
  const [configText, setConfigText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState('')
  const [step, setStep] = useState('paste') // 'paste' | 'confirm'

  function parseConfig(text) {
    // JSON 파싱 시도
    try { return JSON.parse(text) } catch {}
    // JS 객체 형태 파싱 (Firebase 콘솔 복사본)
    const result = {}
    const keys = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId','measurementId']
    for (const key of keys) {
      const m = text.match(new RegExp(`${key}:\\s*["'\`]([^"'\`]+)["'\`]`))
      if (m) result[key] = m[1]
    }
    // vapidKey도 파싱 시도
    const vk = text.match(/vapidKey:\s*["'\`]([^"'\`]+)["'\`]/)
    if (vk) result.vapidKey = vk[1]
    return result.apiKey && result.projectId ? result : null
  }

  function handleParse() {
    setParseError('')
    const result = parseConfig(configText)
    if (!result) {
      setParseError('파싱 실패: Firebase 설정 형식이 올바르지 않습니다.')
      return
    }
    // authDomain / storageBucket 자동 보완
    if (!result.authDomain && result.projectId) result.authDomain = `${result.projectId}.firebaseapp.com`
    if (!result.storageBucket && result.projectId) result.storageBucket = `${result.projectId}.appspot.com`
    setParsed(result)
    setStep('confirm')
  }

  function handleSave() {
    localStorage.setItem('bt_firebase_config', JSON.stringify(parsed))
    localStorage.removeItem('bt_skip_sharing')
    alert('Firebase 설정이 저장됐습니다. 앱을 다시 시작합니다.')
    window.location.reload()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">👨‍👩‍👧 가족 공유 설정</div>

        {isFirebaseConfigured ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-light)', lineHeight: 1.8 }}>
              Firebase가 이미 설정되어 있습니다.<br />
              앱을 재시작하면 처음 화면에서 방 만들기 / 코드 입력을 선택할 수 있어요.
            </p>
            <button className="btn-secondary" onClick={onClose} style={{ marginTop: 16 }}>닫기</button>
          </>
        ) : step === 'paste' ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.7, marginBottom: 16 }}>
              <strong>Firebase 콘솔</strong>에서 웹 앱 설정을 복사해 아래에 붙여넣기 해주세요.<br />
              console.firebase.google.com → 프로젝트 → 앱 추가 → 웹 → 설정 스니펫 복사
            </p>
            <div className="form-group">
              <label className="form-label">Firebase 설정 붙여넣기</label>
              <textarea
                className="form-input"
                style={{ minHeight: 140, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "my-app.firebaseapp.com",\n  projectId: "my-app",\n  ...\n};`}
                value={configText}
                onChange={e => { setConfigText(e.target.value); setParseError('') }}
              />
            </div>
            {parseError && (
              <div style={{ color: '#FF6B6B', fontSize: 13, marginBottom: 12 }}>{parseError}</div>
            )}
            <button className="btn-primary" onClick={handleParse} disabled={!configText.trim()}>
              설정 확인
            </button>
            <button className="btn-secondary" onClick={onClose}>취소</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12 }}>아래 설정으로 저장하시겠어요?</p>
            <div className="card" style={{ background: 'var(--bg)', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.8, marginBottom: 16 }}>
              {Object.entries(parsed).map(([k, v]) => (
                <div key={k}><strong>{k}:</strong> {v.length > 30 ? v.slice(0,30)+'…' : v}</div>
              ))}
            </div>
            <button className="btn-primary" onClick={handleSave}>✅ 저장 후 재시작</button>
            <button className="btn-secondary" onClick={() => setStep('paste')}>← 다시 입력</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const {
    baby, setBaby,
    records, memos,
    roomId, roomCode, memberCount,
    leaveRoom,
    isOnline, syncStatus,
  } = useApp()

  const fileInputRef = useRef()
  const [showBabyEdit, setShowBabyEdit] = useState(false)
  const [showBackup,   setShowBackup]   = useState(false)
  const [showSharing,  setShowSharing]  = useState(false)

  // 아기 정보 수정 폼
  const [name,      setName]      = useState(baby?.name || '')
  const [birthDate, setBirthDate] = useState(baby?.birthDate || '')
  const [gender,    setGender]    = useState(baby?.gender || 'UNKNOWN')

  // 알림 상태
  const [notifStatus, setNotifStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [importMsg, setImportMsg] = useState('')

  const GENDER_MAP = Object.fromEntries(GENDERS.map(g => [g.value, g]))
  const currentGender = GENDER_MAP[baby?.gender] || GENDER_MAP.UNKNOWN

  async function saveBabyInfo() {
    if (!name.trim()) return
    await setBaby({ ...baby, name: name.trim(), birthDate, gender })
    setShowBabyEdit(false)
  }

  async function handleRequestNotif() {
    const result = await requestPushPermission()
    setNotifStatus(result ? 'granted' : Notification.permission)
  }

  // 백업 내보내기
  function handleExport() {
    const data = { version: 1, exportedAt: new Date().toISOString(), baby, records, memos }
    const url  = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a    = Object.assign(document.createElement('a'), { href: url, download: `babytime_${baby?.name || 'backup'}_${data.exportedAt.split('T')[0]}.json` })
    a.click()
    URL.revokeObjectURL(url)
  }

  // 백업 불러오기
  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.baby) throw new Error()
        localStorage.setItem('bt_baby',    JSON.stringify(data.baby))
        localStorage.setItem('bt_records', JSON.stringify(data.records || []))
        localStorage.setItem('bt_memos',   JSON.stringify(data.memos || []))
        setImportMsg('✅ 복원 완료! 새로고침 중...')
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setImportMsg('❌ 올바른 백업 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function copyRoomCode() {
    navigator.clipboard?.writeText(roomCode || '').catch(() => {})
    alert(`코드 "${roomCode}" 가 복사됐습니다!`)
  }

  return (
    <>
      {/* 아기 프로필 요약 카드 */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
        borderRadius: 20, padding: '20px', color: 'white', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 20, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
          {currentGender.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{baby?.name}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{currentGender.label} · {currentGender.desc}</div>
        </div>
        <SyncBadge status={syncStatus} isOnline={isOnline} />
      </div>

      {/* 아기 정보 */}
      <SectionHeader title="아기 정보" />
      <SectionCard>
        <SettingRow icon="👶" label="내 정보" desc="이름, 생년월일, 성별 수정"
          onClick={() => { setName(baby?.name || ''); setBirthDate(baby?.birthDate || ''); setGender(baby?.gender || 'UNKNOWN'); setShowBabyEdit(true) }}
        />
      </SectionCard>

      {/* 가족 공유 */}
      <SectionHeader title="가족 공유" />
      <SectionCard>
        {roomId ? (
          <>
            <SettingRow
              icon="🏠" label="방 코드"
              desc={`코드: ${roomCode} · 참여 인원 ${memberCount}명`}
              onClick={copyRoomCode}
              rightEl={<span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>복사</span>}
            />
            <Divider />
            <SettingRow
              icon={notifStatus === 'granted' ? '🔔' : '🔕'}
              label="푸시 알림"
              desc={notifStatus === 'granted' ? '파트너 기록 시 알림 수신 중' : notifStatus === 'unsupported' ? '이 브라우저는 알림 미지원' : '알림을 허용하면 파트너 기록을 즉시 받아요'}
              onClick={notifStatus !== 'granted' && notifStatus !== 'unsupported' ? handleRequestNotif : null}
              rightEl={notifStatus === 'granted' ? <span style={{ fontSize: 12, color: '#4CAF87', fontWeight: 700 }}>켜짐</span> : null}
            />
            <Divider />
            <SettingRow icon="🚪" label="방 나가기" desc="공유 중단 (로컬 데이터는 유지)"
              onClick={() => { if (confirm('방을 나가시겠어요? 기록은 이 기기에 유지됩니다.')) leaveRoom() }}
              rightEl={<span style={{ fontSize: 13, color: '#FF6B6B' }}>나가기</span>}
            />
          </>
        ) : (
          <SettingRow
            icon={isFirebaseConfigured ? '🔗' : '⚙️'}
            label="가족과 공유 시작"
            desc={isFirebaseConfigured ? '방 만들기 또는 코드 입력으로 공유' : 'Firebase 설정 후 사용 가능'}
            onClick={() => setShowSharing(true)}
          />
        )}
      </SectionCard>

      {/* 데이터 */}
      <SectionHeader title="데이터" />
      <SectionCard>
        <SettingRow icon="💾" label="백업" desc="내보내기 / 불러오기" onClick={() => setShowBackup(true)} />
        <Divider />
        <SettingRow icon="📊" label="저장된 데이터" desc={`기록 ${records.length}건 · 육아일지 ${memos.length}건`} onClick={null} />
      </SectionCard>

      {/* 앱 정보 */}
      <SectionHeader title="앱 정보" />
      <SectionCard>
        <SettingRow icon="🍼" label="BabyTime" desc="버전 0.2.0" onClick={null} />
      </SectionCard>

      {/* ── 아기 정보 수정 모달 ──────────────────────────────────────────── */}
      {showBabyEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBabyEdit(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">👶 내 정보 수정</div>
            <div className="form-group">
              <label className="form-label">아기 이름</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="아기 이름" />
            </div>
            <div className="form-group">
              <label className="form-label">생년월일</label>
              <input type="date" className="form-input" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">성별 · 테마 색상</label>
              <div className="gender-selector">
                {GENDERS.map(g => (
                  <button key={g.value} type="button" className={`gender-btn ${gender === g.value ? 'selected' : ''}`} onClick={() => setGender(g.value)}>
                    <span style={{ fontSize: 26 }}>{g.icon}</span>
                    {g.label}
                    <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 400 }}>{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={saveBabyInfo} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.5 }}>저장</button>
            <button className="btn-secondary" onClick={() => setShowBabyEdit(false)}>취소</button>
          </div>
        </div>
      )}

      {/* ── 공유 방 관리 모달 ─────────────────────────────────────────────── */}
      {showSharing && (
        <FirebaseSharingModal onClose={() => setShowSharing(false)} />
      )}

      {/* ── 백업 모달 ─────────────────────────────────────────────────────── */}
      {showBackup && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBackup(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">💾 데이터 백업</div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>📤</span>
                <div><div style={{ fontSize: 15, fontWeight: 700 }}>내보내기</div><div style={{ fontSize: 12, color: 'var(--text-light)' }}>JSON 파일로 저장</div></div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12, lineHeight: 1.5 }}>
                기록 {records.length}건, 육아일지 {memos.length}건을 파일로 저장합니다.
              </p>
              <button className="btn-primary" onClick={handleExport}>📥 파일 내보내기</button>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>📥</span>
                <div><div style={{ fontSize: 15, fontWeight: 700 }}>불러오기</div><div style={{ fontSize: 12, color: 'var(--text-light)' }}>백업 파일에서 복원</div></div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12, lineHeight: 1.5 }}>⚠️ 현재 데이터가 덮어써집니다.</p>
              {importMsg && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg)', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>{importMsg}</div>}
              <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>📂 파일 선택</button>
            </div>

            <button className="btn-secondary" onClick={() => setShowBackup(false)} style={{ marginTop: 8 }}>닫기</button>
          </div>
        </div>
      )}
    </>
  )
}
