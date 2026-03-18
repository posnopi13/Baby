import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { formatDatetimeLocal } from '../utils/time'

/**
 * AddRecordModal
 * - 추가 모드: defaultPatternId 전달, onClose만 사용
 * - 편집 모드: editRecord 전달, onSave(updates) 콜백 사용
 */
export default function AddRecordModal({ onClose, defaultPatternId, editRecord, onSave }) {
  const { addRecord, startSleep, patterns } = useApp()
  const isEditMode = Boolean(editRecord)

  const [selectedId, setSelectedId] = useState(
    isEditMode ? editRecord.patternId : (defaultPatternId || patterns[0].id)
  )
  const [time, setTime] = useState(
    isEditMode ? formatDatetimeLocal(editRecord.startTime) : formatDatetimeLocal(Date.now())
  )
  const [endTime, setEndTime] = useState(
    isEditMode && editRecord.endTime ? formatDatetimeLocal(editRecord.endTime) : ''
  )
  const [amount, setAmount] = useState(() => {
    if (isEditMode) return editRecord.amount?.toString() || ''
    const patId = defaultPatternId || patterns[0].id
    return localStorage.getItem('bt_last_amount_' + patId) || ''
  })
  const [note, setNote] = useState(isEditMode ? editRecord.note || '' : '')

  const selected = patterns.find(p => p.id === selectedId)
  const isSleep = selected?.category === 'SLEEP'
  const hasEndTime = isEditMode && editRecord.endTime != null // 완료된 수면 기록

  // 추가 모드: 패턴 변경 시 마지막 양 자동 로드
  useEffect(() => {
    if (isEditMode) return
    if (selected?.hasAmount) {
      const last = localStorage.getItem('bt_last_amount_' + selectedId)
      setAmount(last || '')
    } else {
      setAmount('')
    }
  }, [selectedId, isEditMode, selected?.hasAmount])

  function saveLastAmount() {
    if (selected?.hasAmount && amount) {
      localStorage.setItem('bt_last_amount_' + selectedId, amount)
    }
  }

  function adjustAmount(delta) {
    setAmount(prev => {
      const current = parseFloat(prev) || 0
      const next = Math.max(0, current + delta)
      return next === 0 ? '' : next.toString()
    })
  }

  function handleSubmit() {
    const ts = new Date(time).getTime() || Date.now()
    saveLastAmount()

    if (isEditMode) {
      const updates = {
        startTime: ts,
        amount: amount ? parseFloat(amount) : null,
        note: note || null,
      }
      // 수면 종료시간 편집
      if (hasEndTime && endTime) {
        updates.endTime = new Date(endTime).getTime() || editRecord.endTime
      }
      onSave(updates)
      onClose()
      return
    }

    if (isSleep) {
      startSleep(selectedId)
      onClose()
      return
    }

    addRecord({
      id: Date.now().toString(),
      patternId: selectedId,
      startTime: ts,
      amount: amount ? parseFloat(amount) : null,
      note: note || null,
    })
    onClose()
  }

  const DELTA_BTNS = [-100, -50, -10, 10, 50, 100]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{isEditMode ? '✏️ 기록 수정' : '기록 추가'}</div>

        {/* 추가 모드: 패턴 선택 */}
        {!isEditMode && (
          <div className="form-group">
            <label className="form-label">종류</label>
            <div className="pattern-grid">
              {patterns.map(p => (
                <button
                  key={p.id}
                  className={`pattern-btn ${selectedId === p.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <span className="pattern-btn-icon">{p.icon}</span>
                  <span className="pattern-btn-label">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 편집 모드: 패턴 정보 표시 */}
        {isEditMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 12 }}>
            <span style={{ fontSize: 24 }}>{selected?.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{selected?.name}</span>
          </div>
        )}

        {isSleep && !isEditMode ? (
          <div className="card" style={{ background: '#F5F0FF', borderColor: '#C4B5FF' }}>
            <p style={{ fontSize: 14, color: '#6B4EFF', fontWeight: 600 }}>
              💡 시작 시간이 기록되고, 종료 버튼을 누르면 완료됩니다.
            </p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">시작 시간</label>
              <input
                type="datetime-local"
                className="form-input"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>

            {/* 수면 종료시간 편집 (완료된 수면 기록만) */}
            {hasEndTime && (
              <div className="form-group">
                <label className="form-label">종료 시간</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            )}

            {selected?.hasAmount && (
              <div className="form-group">
                <label className="form-label">양 ({selected.amountUnit})</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="예: 120"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  inputMode="decimal"
                />
                {/* 빠른 조절 버튼 */}
                <div className="amount-btns">
                  {DELTA_BTNS.map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`amount-btn ${d > 0 ? 'amount-btn-plus' : 'amount-btn-minus'}`}
                      onClick={() => adjustAmount(d)}
                    >
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">메모 (선택)</label>
              <input
                type="text"
                className="form-input"
                placeholder="간단한 메모..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </>
        )}

        <button className="btn-primary" onClick={handleSubmit}>
          {isEditMode ? '✅ 수정 완료' : isSleep ? '😴 수면 시작' : '✅ 저장'}
        </button>
        <button className="btn-secondary" onClick={onClose}>취소</button>
      </div>
    </div>
  )
}
