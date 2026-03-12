import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, formatDate } from '../utils/time'

const MOODS = [
  { value: 'HAPPY', icon: '😊', label: '좋음' },
  { value: 'NORMAL', icon: '😐', label: '보통' },
  { value: 'FUSSY', icon: '😣', label: '칭얼' },
  { value: 'SICK', icon: '🤒', label: '아픔' },
]

export default function MemoPage() {
  const { memos, addMemo, deleteMemo } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('NORMAL')
  const [temperature, setTemperature] = useState('')
  const [weight, setWeight] = useState('')

  function handleSubmit() {
    if (!content.trim()) return
    addMemo({
      id: Date.now().toString(),
      content: content.trim(),
      mood,
      temperature: temperature ? parseFloat(temperature) : null,
      weight: weight ? parseFloat(weight) : null,
      recordedAt: Date.now(),
    })
    setContent('')
    setMood('NORMAL')
    setTemperature('')
    setWeight('')
    setShowForm(false)
  }

  // Group memos by date
  const groups = []
  let currentDate = null
  memos.forEach(m => {
    const dateLabel = formatDate(m.recordedAt)
    if (dateLabel !== currentDate) {
      currentDate = dateLabel
      groups.push({ date: dateLabel, memos: [] })
    }
    groups[groups.length - 1].memos.push(m)
  })

  const moodMap = Object.fromEntries(MOODS.map(m => [m.value, m]))

  return (
    <>
      {/* Add button */}
      <button
        className="btn-primary"
        style={{ marginBottom: 16 }}
        onClick={() => setShowForm(true)}
      >
        + 메모 작성
      </button>

      {memos.length === 0 && !showForm ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">아직 메모가 없어요</div>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.date}>
            <div className="timeline-date-header">{group.date}</div>
            {group.memos.map(memo => {
              const m = moodMap[memo.mood] || moodMap.NORMAL
              return (
                <div key={memo.id} className="memo-item">
                  <div className="memo-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="memo-mood-badge">{m.icon}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-light)' }}>
                        {m.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="memo-time">{formatTime(memo.recordedAt)}</span>
                      <button
                        className="record-delete-btn"
                        onClick={() => deleteMemo(memo.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="memo-content">{memo.content}</div>
                  {(memo.temperature || memo.weight) && (
                    <div className="memo-vitals">
                      {memo.temperature && (
                        <span className="vital-chip">🌡️ {memo.temperature}°C</span>
                      )}
                      {memo.weight && (
                        <span className="vital-chip">⚖️ {memo.weight}kg</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* Add memo modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">메모 작성</div>

            <div className="form-group">
              <label className="form-label">기분</label>
              <div className="mood-selector">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    className={`mood-btn ${mood === m.value ? 'selected' : ''}`}
                    onClick={() => setMood(m.value)}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">내용</label>
              <textarea
                className="form-input"
                placeholder="메모를 입력하세요..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={3}
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">체온 (°C)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="36.5"
                  value={temperature}
                  onChange={e => setTemperature(e.target.value)}
                  inputMode="decimal"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">몸무게 (kg)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="5.2"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  inputMode="decimal"
                  step="0.1"
                />
              </div>
            </div>

            <button className="btn-primary" onClick={handleSubmit} disabled={!content.trim()} style={{ opacity: content.trim() ? 1 : 0.5 }}>
              저장
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}
    </>
  )
}
