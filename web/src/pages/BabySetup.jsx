import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'

const GENDERS = [
  { value: 'MALE', icon: '👦', label: '남자아이' },
  { value: 'FEMALE', icon: '👧', label: '여자아이' },
  { value: 'UNKNOWN', icon: '🍼', label: '비공개' },
]

function compressPhoto(file, callback) {
  const reader = new FileReader()
  reader.onload = ev => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 240
      const ratio = Math.min(size / img.width, size / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      callback(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

export default function BabySetup() {
  const { addBaby } = useApp()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('UNKNOWN')
  const [photo, setPhoto] = useState(null)
  const photoRef = useRef()

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    compressPhoto(file, setPhoto)
    e.target.value = ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    addBaby({
      name: name.trim(),
      birthDate,
      gender,
      photo: photo || null,
    })
  }

  return (
    <div className="setup-page">
      <div className="setup-emoji">🍼</div>
      <h1 className="setup-title">BabyTime</h1>
      <p className="setup-subtitle">아기 정보를 입력해주세요</p>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        {/* 사진 업로드 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div
            onClick={() => photoRef.current?.click()}
            style={{
              width: 90, height: 90, borderRadius: '50%',
              border: '2px dashed var(--border)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', background: 'var(--bg)',
            }}
          >
            {photo
              ? <img src={photo} alt="아기 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28 }}>📷</div>
                  <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2 }}>사진 추가</div>
                </div>
            }
          </div>
          <input type="file" accept="image/*" ref={photoRef} onChange={handlePhotoUpload} style={{ display: 'none' }} />
        </div>

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
