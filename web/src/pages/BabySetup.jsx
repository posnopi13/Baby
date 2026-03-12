import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function BabySetup() {
  const { setBaby } = useApp()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('UNKNOWN')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBaby({
      id: '1',
      name: name.trim(),
      birthDate,
      gender,
      createdAt: Date.now(),
    })
  }

  const GENDERS = [
    { value: 'MALE', icon: '👦', label: '남자아이' },
    { value: 'FEMALE', icon: '👧', label: '여자아이' },
    { value: 'UNKNOWN', icon: '🍼', label: '비공개' },
  ]

  return (
    <div className="setup-page">
      <div className="setup-emoji">🍼</div>
      <h1 className="setup-title">BabyTime</h1>
      <p className="setup-subtitle">아기 정보를 입력해주세요</p>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div className="form-group">
          <label className="form-label">아기 이름</label>
          <input
            type="text"
            className="form-input"
            placeholder="아기 이름을 입력하세요"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
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
          <label className="form-label">성별</label>
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
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!name.trim()}
          style={{ opacity: name.trim() ? 1 : 0.5 }}
        >
          시작하기 →
        </button>
      </form>
    </div>
  )
}
