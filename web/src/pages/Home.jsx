import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, formatDuration, calcAge, getTodayStart } from '../utils/time'
import AddRecordModal from '../components/AddRecordModal'

const GENDER_ICON = { MALE: '👦', FEMALE: '👧', UNKNOWN: '🍼' }
const DEFAULT_QUICK_IDS = ['p1', 'p2', 'p4', 'p6', 'p7', 'p3', 'p8']

export default function Home() {
  const { baby, records, patterns, activeSleep, startSleep, endSleep, addRecord, updateRecord } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [defaultPattern, setDefaultPattern] = useState(null)
  const [sleepDuration, setSleepDuration] = useState(0)
  const [editingRecord, setEditingRecord] = useState(null)
  const [quickEditMode, setQuickEditMode] = useState(false)
  const [quickPatternIds, setQuickPatternIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bt_quick_patterns'))
      return Array.isArray(saved) ? saved : DEFAULT_QUICK_IDS
    } catch { return DEFAULT_QUICK_IDS }
  })

  const todayStart = getTodayStart()
  const todayRecords = records.filter(r => r.startTime >= todayStart)

  // 오늘 수유: 횟수 + ml 합계
  const todayFoodRecords = todayRecords.filter(r => patterns.find(p => p.id === r.patternId)?.category === 'FOOD')
  const todayFood = todayFoodRecords.length
  const todayFoodMl = todayFoodRecords.reduce((acc, r) => acc + (r.amount || 0), 0)

  const todaySleep = todayRecords.filter(r => patterns.find(p => p.id === r.patternId)?.category === 'SLEEP')
  const totalSleepMs = todaySleep.reduce((acc, r) => r.endTime ? acc + (r.endTime - r.startTime) : acc, 0)

  const todayDiaper = todayRecords.filter(r => patterns.find(p => p.id === r.patternId)?.category === 'DIAPER').length

  const lastFeed = records.find(r => patterns.find(p => p.id === r.patternId)?.category === 'FOOD')
  const lastFeedPattern = lastFeed ? patterns.find(p => p.id === lastFeed.patternId) : null

  // 최근기록: 오늘 기록 우선, 부족 시 전일 포함해서 최대 20개
  const olderRecords = records.filter(r => r.startTime < todayStart)
  const displayRecords = todayRecords.length >= 20
    ? todayRecords
    : [...todayRecords, ...olderRecords.slice(0, 20 - todayRecords.length)]

  // 수면 타이머
  useEffect(() => {
    if (!activeSleep) return
    const interval = setInterval(() => setSleepDuration(Date.now() - activeSleep.startTime), 1000)
    setSleepDuration(Date.now() - activeSleep.startTime)
    return () => clearInterval(interval)
  }, [activeSleep])

  // 빠른 기록: 수면 → startSleep, 기타 → 모달, 나머지 → 즉시 저장
  function handleQuickRecord(patternId) {
    if (!patternId) {
      setDefaultPattern(null)
      setShowModal(true)
      return
    }
    const pattern = patterns.find(p => p.id === patternId)
    if (pattern?.category === 'SLEEP') {
      startSleep(patternId)
      return
    }
    const lastAmt = pattern?.hasAmount
      ? (parseFloat(localStorage.getItem('bt_last_amount_' + patternId)) || null)
      : null
    addRecord({
      id: Date.now().toString(),
      patternId,
      startTime: Date.now(),
      amount: lastAmt,
      note: null,
    })
  }

  function toggleQuickPattern(patternId) {
    setQuickPatternIds(prev => {
      const next = prev.includes(patternId)
        ? prev.filter(id => id !== patternId)
        : [...prev, patternId]
      localStorage.setItem('bt_quick_patterns', JSON.stringify(next))
      return next
    })
  }

  const quickActions = [
    ...quickPatternIds
      .map(id => { const p = patterns.find(pt => pt.id === id); return p ? { patternId: p.id, icon: p.icon, label: p.name } : null })
      .filter(Boolean),
    { patternId: null, icon: '➕', label: '기타' },
  ]

  return (
    <>
      {/* 아기 정보 카드 */}
      <div className="baby-info-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {baby.photo && (
              <img
                src={baby.photo}
                alt={baby.name}
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)', flexShrink: 0 }}
              />
            )}
            <div>
              <div className="baby-name">{baby.name}</div>
              <div className="baby-age">{calcAge(baby.birthDate) || '아기'}</div>
            </div>
          </div>
          {!baby.photo && <div className="baby-gender-badge">{GENDER_ICON[baby.gender]}</div>}
        </div>
        {lastFeed && (
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 13 }}>
            마지막 수유: {lastFeedPattern?.icon} {lastFeedPattern?.name}
            {lastFeed.amount ? ` ${lastFeed.amount}${lastFeedPattern?.amountUnit}` : ''} · {formatTime(lastFeed.startTime)}
          </div>
        )}
      </div>

      {/* 수면 중 배너 */}
      {activeSleep && (
        <div className="sleep-active-banner" onClick={endSleep}>
          <div className="sleep-banner-left">
            <span className="sleep-banner-icon">😴</span>
            <div>
              <div className="sleep-banner-text">수면 중</div>
              <div className="sleep-banner-sub">{formatDuration(sleepDuration)}</div>
            </div>
          </div>
          <button className="sleep-banner-btn">종료</button>
        </div>
      )}

      {/* 오늘 기록 */}
      <div className="card">
        <div className="card-title">오늘 기록</div>
        <div className="summary-grid">
          <div className="summary-chip">
            <span className="summary-chip-icon">🍼</span>
            <span className="summary-chip-count">{todayFood}회</span>
            <span className="summary-chip-label">{todayFoodMl > 0 ? `${todayFoodMl}ml` : '수유'}</span>
          </div>
          <div className="summary-chip">
            <span className="summary-chip-icon">😴</span>
            <span className="summary-chip-count">{totalSleepMs > 0 ? formatDuration(totalSleepMs) : todaySleep.length + '회'}</span>
            <span className="summary-chip-label">수면</span>
          </div>
          <div className="summary-chip">
            <span className="summary-chip-icon">💩</span>
            <span className="summary-chip-count">{todayDiaper}</span>
            <span className="summary-chip-label">기저귀</span>
          </div>
          <div className="summary-chip">
            <span className="summary-chip-icon">📋</span>
            <span className="summary-chip-count">{todayRecords.length}</span>
            <span className="summary-chip-label">전체</span>
          </div>
        </div>
      </div>

      {/* 빠른 기록 */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: 12 }}>
          <span className="card-title" style={{ marginBottom: 0 }}>빠른 기록</span>
          <button
            onClick={() => setQuickEditMode(m => !m)}
            style={{
              fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 10px',
              borderRadius: 8, border: 'none',
              background: quickEditMode ? 'var(--primary)' : 'transparent',
              color: quickEditMode ? 'white' : 'var(--primary)',
            }}
          >
            {quickEditMode ? '완료' : '편집'}
          </button>
        </div>

        {quickEditMode ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 10 }}>빠른 기록에 표시할 항목 선택</p>
            <div className="quick-log-grid">
              {patterns.map(p => (
                <button
                  key={p.id}
                  className={`quick-edit-btn ${quickPatternIds.includes(p.id) ? 'active' : ''}`}
                  onClick={() => toggleQuickPattern(p.id)}
                >
                  {quickPatternIds.includes(p.id) && <span className="quick-edit-check">✓</span>}
                  <span style={{ fontSize: 22 }}>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="quick-log-grid">
            {quickActions.map(action => (
              <button
                key={action.patternId || 'other'}
                className="quick-btn"
                onClick={() => handleQuickRecord(action.patternId)}
              >
                <span className="quick-btn-icon">{action.icon}</span>
                <span className="quick-btn-label">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 최근 기록 - 스크롤 가능, 최대 20개 (오늘 우선) */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">최근 기록</span>
          <span style={{ fontSize: 11, color: 'var(--text-light)' }}>탭하여 수정</span>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>
          {/* 수면 진행 중 항목 */}
          {activeSleep && (() => {
            const p = patterns.find(pt => pt.id === activeSleep.patternId)
            return (
              <div className="record-item record-item-sleep-active">
                <div className="record-icon-wrap" style={{ background: '#7B68EE22' }}>
                  {p?.icon || '😴'}
                </div>
                <div className="record-info">
                  <div className="record-name">{p?.name || '수면'} <span style={{ color: '#7B68EE', fontWeight: 700 }}>진행 중</span></div>
                  <div className="record-detail">{formatDuration(sleepDuration)} 경과</div>
                </div>
                <div className="record-time">{formatTime(activeSleep.startTime)}</div>
              </div>
            )
          })()}

          {displayRecords.length === 0 && !activeSleep ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">아직 기록이 없어요</div>
            </div>
          ) : (
            displayRecords.map((record, idx) => {
              const pattern = patterns.find(p => p.id === record.patternId)
              const duration = record.endTime ? record.endTime - record.startTime : null
              const hasDetail = record.amount || duration || record.note
              // 날짜 구분선
              const prevRecord = displayRecords[idx - 1]
              const showDateSep = idx > 0 && prevRecord &&
                new Date(prevRecord.startTime).toDateString() !== new Date(record.startTime).toDateString()

              return (
                <div key={record.id}>
                  {showDateSep && (
                    <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, padding: '8px 0 4px', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                      {new Date(record.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </div>
                  )}
                  <div
                    className="record-item record-item-clickable"
                    onClick={() => setEditingRecord(record)}
                  >
                    <div className="record-icon-wrap" style={{ background: (pattern?.color || '#FF8FA3') + '22' }}>
                      {pattern?.icon || '📋'}
                    </div>
                    <div className="record-info">
                      <div className="record-name">{pattern?.name || '기록'}</div>
                      <div className="record-detail">
                        {record.amount ? `${record.amount}${pattern?.amountUnit || ''}` : ''}
                        {duration ? formatDuration(duration) : ''}
                        {record.note ? ` · ${record.note}` : ''}
                        {!hasDetail && <span style={{ color: 'var(--primary)', opacity: 0.6 }}>탭하여 상세 입력</span>}
                      </div>
                    </div>
                    <div className="record-time">{formatTime(record.startTime)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 기타 추가 모달 */}
      {showModal && (
        <AddRecordModal
          onClose={() => setShowModal(false)}
          defaultPatternId={defaultPattern}
        />
      )}

      {/* 기록 수정 모달 */}
      {editingRecord && (
        <AddRecordModal
          onClose={() => setEditingRecord(null)}
          editRecord={editingRecord}
          onSave={updates => {
            updateRecord(editingRecord.id, updates)
            setEditingRecord(null)
          }}
        />
      )}
    </>
  )
}
