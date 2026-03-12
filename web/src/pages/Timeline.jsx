import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatTime, formatDate, formatDuration, isSameDay } from '../utils/time'
import AddRecordModal from '../components/AddRecordModal'

const CATEGORY_LABELS = {
  FOOD: '수유',
  SLEEP: '수면',
  DIAPER: '기저귀',
  MEDICATION: '약',
  ALL: '전체',
}

const FILTERS = ['ALL', 'FOOD', 'SLEEP', 'DIAPER', 'MEDICATION']

export default function Timeline() {
  const { records, patterns, deleteRecord } = useApp()
  const [filter, setFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)

  const filtered = filter === 'ALL'
    ? records
    : records.filter(r => {
        const p = patterns.find(p => p.id === r.patternId)
        return p?.category === filter
      })

  // Group by date
  const groups = []
  let currentDate = null
  filtered.forEach(r => {
    const dateLabel = formatDate(r.startTime)
    if (dateLabel !== currentDate) {
      currentDate = dateLabel
      groups.push({ date: dateLabel, records: [] })
    }
    groups[groups.length - 1].records.push(r)
  })

  return (
    <>
      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 4,
        marginBottom: 12,
        scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              border: '2px solid',
              borderColor: filter === f ? 'var(--primary)' : 'var(--border)',
              background: filter === f ? 'var(--primary)' : 'white',
              color: filter === f ? 'white' : 'var(--text-light)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {CATEGORY_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">기록이 없어요</div>
          <button
            className="btn-primary"
            style={{ marginTop: 20, width: 'auto', padding: '12px 32px' }}
            onClick={() => setShowModal(true)}
          >
            첫 기록 추가하기
          </button>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.date}>
            <div className="timeline-date-header">{group.date}</div>
            <div className="card">
              {group.records.map(record => {
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
                        {record.amount ? `${record.amount}${pattern?.amountUnit || ''} ` : ''}
                        {duration ? <span className="duration-badge">{formatDuration(duration)}</span> : null}
                        {record.note ? ` ${record.note}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="record-time">{formatTime(record.startTime)}</span>
                      <button
                        className="record-delete-btn"
                        onClick={() => deleteRecord(record.id)}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position: 'fixed',
          bottom: 76,
          right: 'max(16px, calc(50vw - 224px))',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          fontSize: 28,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(255,107,157,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        +
      </button>

      {showModal && <AddRecordModal onClose={() => setShowModal(false)} />}
    </>
  )
}
