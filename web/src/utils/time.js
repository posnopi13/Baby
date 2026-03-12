export function formatTime(ts) {
  const d = new Date(ts)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h < 12 ? '오전' : '오후'
  const hour = h % 12 || 12
  return `${ampm} ${hour}:${m}`
}

export function formatDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}

export function calcAge(birthDateStr) {
  if (!birthDateStr) return ''
  const birth = new Date(birthDateStr)
  const now = new Date()
  const diffMs = now - birth
  const days = Math.floor(diffMs / 86400000)
  if (days < 30) return `생후 ${days}일`
  const months = Math.floor(days / 30.44)
  if (months < 24) return `${months}개월`
  const years = Math.floor(months / 12)
  return `${years}살`
}

export function isSameDay(ts1, ts2) {
  const d1 = new Date(ts1)
  const d2 = new Date(ts2)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

export function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function formatDatetimeLocal(ts) {
  const d = new Date(ts)
  const pad = n => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
