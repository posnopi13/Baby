import { useState } from 'react'
import { useApp, DEFAULT_PATTERNS } from '../context/AppContext'
import { formatDatetimeLocal } from '../utils/time'

export default function AddRecordModal({ onClose, defaultPatternId }) {
  const { addRecord, startSleep, patterns } = useApp()
  const [selectedId, setSelectedId] = useState(defaultPatternId || patterns[0].id)
  const [time, setTime] = useState(formatDatetimeLocal(Date.now()))
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const selected = patterns.find(p => p.id === selectedId)
  const isSleep = selected?.category === 'SLEEP'

  function handleSubmit() {
    const ts = new Date(time).getTime() || Date.now()

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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">기록 추가</div>

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

        {isSleep ? (
          <div className="card" style={{ background: '#F5F0FF', borderColor: '#C4B5FF' }}>
            <p style={{ fontSize: 14, color: '#6B4EFF', fontWeight: 600 }}>
              💡 시작 시간이 기록되고, 종료 버튼을 누르면 완료됩니다.
            </p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">시간</label>
              <input
                type="datetime-local"
                className="form-input"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>

            {selected?.hasAmount && (
              <div className="form-group">
                <label className="form-label">양 ({selected.amountUnit})</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder={`예: 120`}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  inputMode="decimal"
                />
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
          {isSleep ? '😴 수면 시작' : '✅ 저장'}
        </button>
        <button className="btn-secondary" onClick={onClose}>취소</button>
      </div>
    </div>
  )
}
