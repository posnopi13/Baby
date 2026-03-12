import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'

const GENDERS = [
  { value: 'MALE', icon: '👦', label: '남자아이', desc: '파란색 테마' },
  { value: 'FEMALE', icon: '👧', label: '여자아이', desc: '분홍색 테마' },
  { value: 'UNKNOWN', icon: '🍼', label: '비공개', desc: '보라색 테마' },
]

function SettingRow({ icon, label, desc, onClick, rightEl }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: 'white',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseDown={e => onClick && (e.currentTarget.style.background = 'var(--bg)')}
      onMouseUp={e => (e.currentTarget.style.background = 'white')}
      onTouchStart={e => onClick && (e.currentTarget.style.background = 'var(--bg)')}
      onTouchEnd={e => (e.currentTarget.style.background = 'white')}
    >
      <span style={{ fontSize: 22, width: 32, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{desc}</div>}
      </div>
      {rightEl || (onClick && (
        <span style={{ fontSize: 18, color: 'var(--text-light)' }}>›</span>
      ))}
    </button>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{
      padding: '20px 16px 6px',
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--text-light)',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    }}>
      {title}
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      marginBottom: 4,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return (
    <div style={{ height: 1, background: 'var(--border)', marginLeft: 62 }} />
  )
}

export default function SettingsPage() {
  const { baby, setBaby, records, memos, activeSleep } = useApp()
  const [showBabyEdit, setShowBabyEdit] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [name, setName] = useState(baby?.name || '')
  const [birthDate, setBirthDate] = useState(baby?.birthDate || '')
  const [gender, setGender] = useState(baby?.gender || 'UNKNOWN')
  const [importMsg, setImportMsg] = useState('')
  const fileInputRef = useRef()

  function saveBabyInfo() {
    if (!name.trim()) return
    setBaby({ ...baby, name: name.trim(), birthDate, gender })
    setShowBabyEdit(false)
  }

  // Export backup
  function handleExport() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      baby,
      records,
      memos,
      activeSleep,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `babytime_${baby?.name || 'backup'}_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import backup
  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.baby) throw new Error('invalid')
        localStorage.setItem('bt_baby', JSON.stringify(data.baby))
        localStorage.setItem('bt_records', JSON.stringify(data.records || []))
        localStorage.setItem('bt_memos', JSON.stringify(data.memos || []))
        localStorage.setItem('bt_active_sleep', JSON.stringify(data.activeSleep || null))
        setImportMsg('✅ 복원 완료! 새로고침 중...')
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setImportMsg('❌ 올바른 백업 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const GENDER_MAP = Object.fromEntries(GENDERS.map(g => [g.value, g]))
  const currentGender = GENDER_MAP[baby?.gender] || GENDER_MAP.UNKNOWN

  return (
    <>
      {/* Baby profile summary */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
        borderRadius: 20,
        padding: '20px 20px',
        color: 'white',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 20,
          background: 'rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
        }}>
          {currentGender.icon}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{baby?.name}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            {currentGender.label} · {currentGender.desc}
          </div>
        </div>
      </div>

      {/* 아기 정보 */}
      <SectionHeader title="아기 정보" />
      <SectionCard>
        <SettingRow
          icon="👶"
          label="내 정보"
          desc="이름, 생년월일, 성별 수정"
          onClick={() => {
            setName(baby?.name || '')
            setBirthDate(baby?.birthDate || '')
            setGender(baby?.gender || 'UNKNOWN')
            setShowBabyEdit(true)
          }}
        />
      </SectionCard>

      {/* 데이터 */}
      <SectionHeader title="데이터" />
      <SectionCard>
        <SettingRow
          icon="💾"
          label="백업"
          desc="데이터 내보내기 / 불러오기"
          onClick={() => setShowBackup(true)}
        />
        <Divider />
        <SettingRow
          icon="📊"
          label="저장된 데이터"
          desc={`기록 ${records.length}건 · 육아일지 ${memos.length}건`}
          onClick={null}
          rightEl={null}
        />
      </SectionCard>

      {/* 앱 정보 */}
      <SectionHeader title="앱 정보" />
      <SectionCard>
        <SettingRow
          icon="🍼"
          label="BabyTime"
          desc="버전 0.1.0 · 데이터는 이 기기에만 저장됩니다"
          onClick={null}
        />
        <Divider />
        <SettingRow
          icon="☁️"
          label="엄마아빠 공유 기능"
          desc="서버 연동이 필요합니다 (준비 중)"
          onClick={() => alert(
            '📡 공유 기능 안내\n\n' +
            '실시간으로 엄마아빠가 함께 기록을 보려면\n' +
            '서버(클라우드 DB)가 필요합니다.\n\n' +
            '현재는 백업 파일을 카카오톡 등으로\n' +
            '공유하는 방식을 사용할 수 있어요.\n\n' +
            '🔜 향후 Firebase 연동으로\n' +
            '실시간 공유 기능 추가 예정!'
          )}
        />
      </SectionCard>

      {/* 아기 정보 수정 모달 */}
      {showBabyEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBabyEdit(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">👶 내 정보 수정</div>

            <div className="form-group">
              <label className="form-label">아기 이름</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="아기 이름"
              />
            </div>

            <div className="form-group">
              <label className="form-label">생년월일</label>
              <input
                type="date"
                className="form-input"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">성별 · 테마 색상</label>
              <div className="gender-selector">
                {GENDERS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    className={`gender-btn ${gender === g.value ? 'selected' : ''}`}
                    onClick={() => setGender(g.value)}
                  >
                    <span style={{ fontSize: 26 }}>{g.icon}</span>
                    {g.label}
                    <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 400 }}>
                      {g.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={saveBabyInfo}
              disabled={!name.trim()}
              style={{ opacity: name.trim() ? 1 : 0.5 }}
            >
              저장
            </button>
            <button className="btn-secondary" onClick={() => setShowBabyEdit(false)}>취소</button>
          </div>
        </div>
      )}

      {/* 백업 모달 */}
      {showBackup && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBackup(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">💾 데이터 백업</div>

            {/* Export */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>📤</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>내보내기</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>JSON 파일로 저장</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12, lineHeight: 1.5 }}>
                기록 {records.length}건, 육아일지 {memos.length}건을 파일로 내보냅니다.
                카카오톡 등으로 공유하면 다른 기기에서 불러올 수 있어요.
              </p>
              <button className="btn-primary" onClick={handleExport}>
                📥 파일 내보내기
              </button>
            </div>

            {/* Import */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>📥</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>불러오기</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>백업 파일에서 복원</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 12, lineHeight: 1.5 }}>
                ⚠️ 현재 데이터가 덮어써집니다.
              </p>
              {importMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--bg)',
                  fontSize: 13,
                  marginBottom: 10,
                  fontWeight: 600,
                }}>
                  {importMsg}
                </div>
              )}
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                📂 파일 선택
              </button>
            </div>

            <button className="btn-secondary" onClick={() => setShowBackup(false)} style={{ marginTop: 8 }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
