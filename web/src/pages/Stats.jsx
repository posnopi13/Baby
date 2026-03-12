import { useApp } from '../context/AppContext'
import { getTodayStart, formatDuration } from '../utils/time'

export default function Stats() {
  const { records, patterns } = useApp()

  const todayStart = getTodayStart()
  const weekStart = todayStart - 6 * 86400000

  const weekRecords = records.filter(r => r.startTime >= weekStart)

  function countByCategory(cat) {
    return weekRecords.filter(r => {
      const p = patterns.find(p => p.id === r.patternId)
      return p?.category === cat
    })
  }

  const foodRecords = countByCategory('FOOD')
  const sleepRecords = countByCategory('SLEEP')
  const diaperRecords = countByCategory('DIAPER')

  // Daily counts for last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = todayStart - (6 - i) * 86400000
    const end = start + 86400000
    const d = new Date(start)
    const label = i === 6 ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}`
    const count = records.filter(r => r.startTime >= start && r.startTime < end).length
    return { label, count, start }
  })

  const maxCount = Math.max(...days.map(d => d.count), 1)

  // Total sleep this week
  const totalSleepMs = sleepRecords.reduce((acc, r) => {
    if (r.endTime) return acc + (r.endTime - r.startTime)
    return acc
  }, 0)

  // Food amounts
  const totalFood = foodRecords.reduce((acc, r) => acc + (r.amount || 0), 0)
  const avgFood = foodRecords.length > 0 ? Math.round(totalFood / 7) : 0

  const STATS = [
    { icon: '🍼', label: '이번 주 수유', value: `${foodRecords.length}회`, sub: avgFood > 0 ? `하루 평균 ${Math.round(foodRecords.length / 7)}회` : null, color: 'var(--food)' },
    { icon: '😴', label: '이번 주 수면', value: totalSleepMs > 0 ? formatDuration(totalSleepMs) : `${sleepRecords.length}회`, sub: null, color: 'var(--sleep)' },
    { icon: '💩', label: '이번 주 기저귀', value: `${diaperRecords.length}회`, sub: `하루 평균 ${Math.round(diaperRecords.length / 7)}회`, color: 'var(--diaper)' },
    { icon: '📋', label: '이번 주 전체', value: `${weekRecords.length}건`, sub: null, color: 'var(--primary)' },
  ]

  return (
    <>
      {/* Summary chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {STATS.map(s => (
          <div key={s.label} className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Daily activity chart */}
      <div className="card">
        <div className="card-title">일별 기록 수 (최근 7일)</div>
        {days.map(day => (
          <div key={day.start} className="stat-bar-wrap">
            <div className="stat-bar-label">
              <span>{day.label}</span>
              <span>{day.count}건</span>
            </div>
            <div className="stat-bar-bg">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${(day.count / maxCount) * 100}%`,
                  background: 'var(--primary)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="card">
        <div className="card-title">카테고리별 기록 (이번 주)</div>
        {[
          { label: '수유', count: foodRecords.length, color: 'var(--food)' },
          { label: '수면', count: sleepRecords.length, color: 'var(--sleep)' },
          { label: '기저귀', count: diaperRecords.length, color: 'var(--diaper)' },
        ].map(item => (
          <div key={item.label} className="stat-bar-wrap">
            <div className="stat-bar-label">
              <span>{item.label}</span>
              <span>{item.count}건</span>
            </div>
            <div className="stat-bar-bg">
              <div
                className="stat-bar-fill"
                style={{
                  width: weekRecords.length > 0 ? `${(item.count / weekRecords.length) * 100}%` : '0%',
                  background: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
