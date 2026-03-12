import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, formatDuration, calcAge, getTodayStart, isSameDay } from '../utils/time'
import AddRecordModal from '../components/AddRecordModal'

const GENDER_ICON = { MALE: '👦', FEMALE: '👧', UNKNOWN: '🍼' }

export default function Home() {
  const { baby, records, patterns, activeSleep, endSleep } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [defaultPattern, setDefaultPattern] = useState(null)
  const [sleepDuration, setSleepDuration] = useState(0)

  const todayStart = getTodayStart()
  const todayRecords = records.filter(r => r.startTime >= todayStart)

  // Count today's records by category
  const todayFood = todayRecords.filter(r => {
    const p = patterns.find(p => p.id === r.patternId)
    return p?.category === 'FOOD'
  }).length

  const todaySleep = todayRecords.filter(r => {
    const p = patterns.find(p => p.id === r.patternId)
    return p?.category === 'SLEEP'
  })
  const totalSleepMs = todaySleep.reduce((acc, r) => {
    if (r.endTime) return acc + (r.endTime - r.startTime)
    return acc
  }, 0)

  const todayDiaper = todayRecords.filter(r => {
    const p = patterns.find(p => p.id === r.patternId)
    return p?.category === 'DIAPER'
  }).length

  // Last feeding info
  const lastFeed = records.find(r => {
    const p = patterns.find(p => p.id === r.patternId)
    return p?.category === 'FOOD'
  })

  const lastFeedPattern = lastFeed ? patterns.find(p => p.id === lastFeed.patternId) : null

  // Active sleep timer
  useEffect(() => {
    if (!activeSleep) return
    const interval = setInterval(() => {
      setSleepDuration(Date.now() - activeSleep.startTime)
    }, 1000)
    setSleepDuration(Date.now() - activeSleep.startTime)
    return () => clearInterval(interval)
  }, [activeSleep])

  const recentRecords = records.slice(0, 5)

  function openModal(patternId) {
    setDefaultPattern(patternId)
    setShowModal(true)
  }

  const QUICK_ACTIONS = [
    { patternId: 'p1', icon: '🍼', label: '분유' },
    { patternId: 'p2', icon: '🤱', label: '모유' },
    { patternId: 'p4', icon: '🌙', label: '수면' },
    { patternId: 'p6', icon: '💧', label: '쉬' },
    { patternId: 'p7', icon: '💩', label: '응가' },
    { patternId: 'p3', icon: '🥣', label: '이유식' },
    { patternId: 'p8', icon: '💊', label: '약' },
    { patternId: null, icon: '➕', label: '기타' },
  ]

  return (
    <>
      {/* Baby info card */}
      <div className="baby-info-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="baby-name">{baby.name}</div>
            <div className="baby-age">{calcAge(baby.birthDate) || '아기'}</div>
          </div>
          <div className="baby-gender-badge">{GENDER_ICON[baby.gender]}</div>
        </div>
        {lastFeed && (
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 13 }}>
            마지막 수유: {lastFeedPattern?.icon} {lastFeedPattern?.name}
            {lastFeed.amount ? ` ${lastFeed.amount}${lastFeedPattern?.amountUnit}` : ''} · {formatTime(lastFeed.startTime)}
          </div>
        )}
      </div>

      {/* Active sleep banner */}
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

      {/* Today summary */}
      <div className="card">
        <div className="card-title">오늘 기록</div>
        <div className="summary-grid">
          <div className="summary-chip">
            <span className="summary-chip-icon">🍼</span>
            <span className="summary-chip-count">{todayFood}</span>
            <span className="summary-chip-label">수유</span>
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

      {/* Quick log */}
      <div className="card">
        <div className="card-title">빠른 기록</div>
        <div className="quick-log-grid">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.patternId || 'other'}
              className="quick-btn"
              onClick={() => openModal(action.patternId)}
            >
              <span className="quick-btn-icon">{action.icon}</span>
              <span className="quick-btn-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent records */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">최근 기록</span>
        </div>
        {recentRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">아직 기록이 없어요</div>
          </div>
        ) : (
          recentRecords.map(record => {
            const pattern = patterns.find(p => p.id === record.patternId)
            const duration = record.endTime ? record.endTime - record.startTime : null
            return (
              <div key={record.id} className="record-item">
                <div
                  className="record-icon-wrap"
                  style={{ background: (pattern?.color || '#FF8FA3') + '22' }}
                >
                  {pattern?.icon || '📋'}
                </div>
                <div className="record-info">
                  <div className="record-name">{pattern?.name || '기록'}</div>
                  <div className="record-detail">
                    {record.amount ? `${record.amount}${pattern?.amountUnit || ''}` : ''}
                    {duration ? formatDuration(duration) : ''}
                    {record.note ? ` · ${record.note}` : ''}
                  </div>
                </div>
                <div className="record-time">{formatTime(record.startTime)}</div>
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <AddRecordModal
          onClose={() => setShowModal(false)}
          defaultPatternId={defaultPattern}
        />
      )}
    </>
  )
}
