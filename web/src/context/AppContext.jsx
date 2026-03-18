import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, getDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured, generateRoomCode, getDeviceId } from '../firebase'

// ─── 기본 패턴 ───────────────────────────────────────────────────────────────
export const DEFAULT_PATTERNS = [
  { id: 'p1', name: '분유',   category: 'FOOD',       icon: '🍼', color: '#FF8FA3', hasAmount: true,  amountUnit: 'ml' },
  { id: 'p2', name: '모유',   category: 'FOOD',       icon: '🤱', color: '#FFB3CE', hasAmount: true,  amountUnit: 'ml' },
  { id: 'p3', name: '이유식', category: 'FOOD',       icon: '🥣', color: '#FFCC80', hasAmount: true,  amountUnit: 'g'  },
  { id: 'p4', name: '밤잠',   category: 'SLEEP',      icon: '🌙', color: '#7B68EE', hasAmount: false },
  { id: 'p5', name: '낮잠',   category: 'SLEEP',      icon: '😴', color: '#9B8FFF', hasAmount: false },
  { id: 'p6', name: '쉬',     category: 'DIAPER',     icon: '💧', color: '#64C8A0', hasAmount: false },
  { id: 'p7', name: '응가',   category: 'DIAPER',     icon: '💩', color: '#A8D8A8', hasAmount: false },
  { id: 'p8', name: '약',     category: 'MEDICATION', icon: '💊', color: '#FFB347', hasAmount: false },
]

// ─── 로컬스토리지 헬퍼 ──────────────────────────────────────────────────────
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ─── babies 초기화 (구버전 bt_baby 마이그레이션) ─────────────────────────
function initBabies() {
  const existing = load('bt_babies', null)
  if (existing && existing.length > 0) return existing
  const oldBaby = load('bt_baby', null)
  if (oldBaby) {
    const migrated = [{ ...oldBaby, id: oldBaby.id || 'baby_1' }]
    save('bt_babies', migrated)
    save('bt_active_baby_id', migrated[0].id)
    return migrated
  }
  return []
}
function initActiveBabyId(babies) {
  const saved = load('bt_active_baby_id', null)
  if (saved && babies.find(b => b.id === saved)) return saved
  return babies[0]?.id || null
}

// ─── 파트너 알림 ─────────────────────────────────────────────────────────────
function notifyPartner(type, data) {
  if (Notification.permission !== 'granted') return
  let body = ''
  if (type === 'record') {
    const p = DEFAULT_PATTERNS.find(p => p.id === data.patternId)
    body = `${p?.icon ?? ''} ${p?.name ?? '기록'}${data.amount ? ` ${data.amount}${p?.amountUnit ?? ''}` : ''}`
  } else {
    body = data.content?.slice(0, 60) || '새 육아일지가 작성됐어요'
  }
  try {
    new Notification('👶 파트너가 기록을 추가했어요', { body, icon: '/Baby/icon-192.png' })
  } catch {}
}

// Firestore 동기화 시 사진 제외 (용량 문제)
function stripPhoto(baby) {
  const { photo: _, ...rest } = baby || {}
  return rest
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [babies,        setBabiesState]      = useState(() => initBabies())
  const [activeBabyId,  setActiveBabyIdState]= useState(() => initActiveBabyId(initBabies()))
  const [allRecords,    setAllRecordsState]  = useState(() => load('bt_records',       []))
  const [memos,         setMemosState]       = useState(() => load('bt_memos',         []))
  const [activeSleep,   setActiveSleepState] = useState(() => load('bt_active_sleep',  null))
  const [roomId,        setRoomIdState]      = useState(() => load('bt_room_id',       null))
  const [roomCode,      setRoomCodeState]    = useState(() => load('bt_room_code',     null))
  const [memberCount,   setMemberCount]      = useState(1)
  const [syncStatus,    setSyncStatus]       = useState('local')
  const [isOnline,      setIsOnline]         = useState(navigator.onLine)

  const connectedAt = useRef(0)

  // 현재 활성 아기 (computed)
  const baby = useMemo(
    () => babies.find(b => b.id === activeBabyId) || babies[0] || null,
    [babies, activeBabyId]
  )

  // 활성 아기의 기록만 필터링 (구버전 babyId 없는 기록은 첫 번째 아기 소속)
  const records = useMemo(() => {
    const firstBabyId = babies[0]?.id
    return allRecords.filter(r => {
      if (r.babyId) return r.babyId === activeBabyId
      return activeBabyId === firstBabyId
    })
  }, [allRecords, activeBabyId, babies])

  // ─ 온/오프라인 감지
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ─ URL 파라미터에서 join 코드 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode) {
      localStorage.setItem('bt_pending_join', joinCode.toUpperCase())
      const url = new URL(window.location)
      url.searchParams.delete('join')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // ─ Firestore 실시간 리스너
  useEffect(() => {
    if (!roomId || !isFirebaseConfigured || !db) return

    setSyncStatus('syncing')
    connectedAt.current = Date.now()
    const myId = getDeviceId()

    const unsubRecords = onSnapshot(
      collection(db, 'families', roomId, 'records'),
      snap => {
        const data = snap.docs
          .map(d => ({ ...d.data(), id: d.id }))
          .sort((a, b) => b.startTime - a.startTime)
        setAllRecordsState(data)
        save('bt_records', data)
        setSyncStatus('synced')

        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return
          const r = change.doc.data()
          if (Date.now() - connectedAt.current > 4000 && r.createdBy && r.createdBy !== myId) {
            notifyPartner('record', r)
          }
        })
      },
      () => setSyncStatus('error')
    )

    const unsubMemos = onSnapshot(
      collection(db, 'families', roomId, 'memos'),
      snap => {
        const data = snap.docs
          .map(d => ({ ...d.data(), id: d.id }))
          .sort((a, b) => b.recordedAt - a.recordedAt)
        setMemosState(data)
        save('bt_memos', data)

        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return
          const m = change.doc.data()
          if (Date.now() - connectedAt.current > 4000 && m.createdBy && m.createdBy !== myId) {
            notifyPartner('memo', m)
          }
        })
      }
    )

    const unsubFamily = onSnapshot(
      doc(db, 'families', roomId),
      snap => {
        if (!snap.exists()) return
        const d = snap.data()

        // 다중 아기 (신규 포맷)
        if (d.babies !== undefined) {
          const remoteBabies = d.babies
          const currentBabies = load('bt_babies', [])
          // 로컬 사진 보존 (Firestore에는 사진 미저장)
          const merged = remoteBabies.map(rb => ({
            ...rb,
            photo: currentBabies.find(lb => lb.id === rb.id)?.photo,
          }))
          setBabiesState(merged)
          save('bt_babies', merged)
        } else if (d.baby !== undefined) {
          // 구버전 단일 아기 마이그레이션
          const oldBaby = { ...d.baby, id: d.baby.id || 'baby_1' }
          const currentBabies = load('bt_babies', [])
          const merged = [{ ...oldBaby, photo: currentBabies.find(lb => lb.id === oldBaby.id)?.photo }]
          setBabiesState(merged)
          save('bt_babies', merged)
        }

        if (d.activeBabyId !== undefined) {
          setActiveBabyIdState(d.activeBabyId)
          save('bt_active_baby_id', d.activeBabyId)
        }
        if (d.activeSleep !== undefined) {
          setActiveSleepState(d.activeSleep)
          save('bt_active_sleep', d.activeSleep)
        }
        if (d.memberCount !== undefined) setMemberCount(d.memberCount)
      }
    )

    return () => { unsubRecords(); unsubMemos(); unsubFamily() }
  }, [roomId])

  // ─── 아기 업데이트 (active baby 수정)
  const setBaby = useCallback(async updates => {
    setBabiesState(prev => {
      const next = prev.map(b => b.id === activeBabyId ? { ...b, ...updates } : b)
      save('bt_babies', next)
      return next
    })
    if (roomId && db) {
      const currentBabies = babies.map(b =>
        b.id === activeBabyId ? { ...stripPhoto(b), ...stripPhoto(updates) } : stripPhoto(b)
      )
      await setDoc(doc(db, 'families', roomId), { babies: currentBabies }, { merge: true })
    }
  }, [activeBabyId, babies, roomId])

  // ─── 아기 추가
  const addBaby = useCallback(async babyData => {
    const newBaby = { ...babyData, id: Date.now().toString(), createdAt: Date.now() }
    const newBabies = [...babies, newBaby]
    setBabiesState(newBabies)
    save('bt_babies', newBabies)
    setActiveBabyIdState(newBaby.id)
    save('bt_active_baby_id', newBaby.id)
    if (roomId && db) {
      await setDoc(doc(db, 'families', roomId), { babies: newBabies.map(stripPhoto), activeBabyId: newBaby.id }, { merge: true })
    }
    return newBaby
  }, [babies, roomId])

  // ─── 아기 삭제
  const deleteBaby = useCallback(async id => {
    const newBabies = babies.filter(b => b.id !== id)
    setBabiesState(newBabies)
    save('bt_babies', newBabies)
    // 삭제한 아기가 active이면 다음 아기로 전환
    if (activeBabyId === id) {
      const nextId = newBabies[0]?.id || null
      setActiveBabyIdState(nextId)
      save('bt_active_baby_id', nextId)
    }
    // 해당 아기 기록 제거
    setAllRecordsState(prev => {
      const firstBabyId = babies[0]?.id
      const next = prev.filter(r => {
        if (r.babyId) return r.babyId !== id
        return id !== firstBabyId // 구버전 기록 처리
      })
      save('bt_records', next)
      return next
    })
    if (roomId && db) {
      await setDoc(doc(db, 'families', roomId), { babies: newBabies.map(stripPhoto) }, { merge: true })
    }
  }, [babies, activeBabyId, roomId])

  // ─── 활성 아기 전환
  const setActiveBaby = useCallback(async id => {
    setActiveBabyIdState(id)
    save('bt_active_baby_id', id)
    if (roomId && db) {
      await setDoc(doc(db, 'families', roomId), { activeBabyId: id }, { merge: true })
    }
  }, [roomId])

  // ─── 기록 추가 (babyId 자동 포함)
  const addRecord = useCallback(async record => {
    const enriched = { ...record, babyId: activeBabyId, createdBy: getDeviceId(), createdAt: Date.now() }
    setAllRecordsState(prev => {
      const next = [enriched, ...prev].sort((a, b) => b.startTime - a.startTime)
      save('bt_records', next)
      return next
    })
    if (roomId && db) await setDoc(doc(db, 'families', roomId, 'records', record.id), enriched)
  }, [roomId, activeBabyId])

  // ─── 기록 수정
  const updateRecord = useCallback(async (id, updates) => {
    setAllRecordsState(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r)
        .sort((a, b) => b.startTime - a.startTime)
      save('bt_records', next)
      return next
    })
    if (roomId && db) {
      const current = allRecords.find(r => r.id === id)
      if (current) await setDoc(doc(db, 'families', roomId, 'records', id), { ...current, ...updates })
    }
  }, [roomId, allRecords])

  // ─── 기록 삭제
  const deleteRecord = useCallback(async id => {
    setAllRecordsState(prev => { const n = prev.filter(r => r.id !== id); save('bt_records', n); return n })
    if (roomId && db) await deleteDoc(doc(db, 'families', roomId, 'records', id))
  }, [roomId])

  // ─── 육아일지 추가
  const addMemo = useCallback(async memo => {
    const enriched = { ...memo, createdBy: getDeviceId(), createdAt: Date.now() }
    setMemosState(prev => { const n = [enriched, ...prev]; save('bt_memos', n); return n })
    if (roomId && db) await setDoc(doc(db, 'families', roomId, 'memos', memo.id), enriched)
  }, [roomId])

  // ─── 육아일지 삭제
  const deleteMemo = useCallback(async id => {
    setMemosState(prev => { const n = prev.filter(m => m.id !== id); save('bt_memos', n); return n })
    if (roomId && db) await deleteDoc(doc(db, 'families', roomId, 'memos', id))
  }, [roomId])

  // ─── 수면 시작
  const startSleep = useCallback(async patternId => {
    const s = { id: Date.now().toString(), patternId, startTime: Date.now(), babyId: activeBabyId }
    setActiveSleepState(s)
    save('bt_active_sleep', s)
    if (roomId && db) await setDoc(doc(db, 'families', roomId), { activeSleep: s }, { merge: true })
  }, [roomId, activeBabyId])

  // ─── 수면 종료
  const endSleep = useCallback(async () => {
    if (!activeSleep) return null
    const rec = { ...activeSleep, endTime: Date.now() }
    await addRecord(rec)
    setActiveSleepState(null)
    save('bt_active_sleep', null)
    if (roomId && db) await setDoc(doc(db, 'families', roomId), { activeSleep: null }, { merge: true })
    return rec
  }, [activeSleep, addRecord, roomId])

  // ─── 방 만들기
  const createRoom = useCallback(async () => {
    if (!db) throw new Error('Firebase가 설정되지 않았습니다')
    const code     = generateRoomCode()
    const familyId = (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2))

    await setDoc(doc(db, 'rooms', code), { familyId, createdAt: Date.now() })
    await setDoc(doc(db, 'families', familyId), {
      babies: babies.map(stripPhoto),
      activeBabyId,
      activeSleep: null,
      memberCount: 1,
      createdAt: Date.now(),
    })

    const myId = getDeviceId()
    for (const r of allRecords)
      await setDoc(doc(db, 'families', familyId, 'records', r.id), { ...r, createdBy: myId, createdAt: Date.now() })
    for (const m of memos)
      await setDoc(doc(db, 'families', familyId, 'memos', m.id),   { ...m, createdBy: myId, createdAt: Date.now() })

    setRoomIdState(familyId)
    setRoomCodeState(code)
    save('bt_room_id',   familyId)
    save('bt_room_code', code)
    return code
  }, [babies, activeBabyId, allRecords, memos])

  // ─── 방 참여
  const joinRoom = useCallback(async code => {
    if (!db) throw new Error('Firebase가 설정되지 않았습니다')
    const snap = await getDoc(doc(db, 'rooms', code.toUpperCase().trim()))
    if (!snap.exists()) throw new Error('존재하지 않는 방 코드입니다')

    const { familyId } = snap.data()
    const famSnap = await getDoc(doc(db, 'families', familyId))
    if (famSnap.exists()) {
      await setDoc(doc(db, 'families', familyId),
        { memberCount: (famSnap.data().memberCount || 1) + 1 },
        { merge: true }
      )
    }

    setRoomIdState(familyId)
    setRoomCodeState(code.toUpperCase().trim())
    save('bt_room_id',   familyId)
    save('bt_room_code', code.toUpperCase().trim())
  }, [])

  // ─── 방 나가기
  const leaveRoom = useCallback(() => {
    setRoomIdState(null)
    setRoomCodeState(null)
    save('bt_room_id',   null)
    save('bt_room_code', null)
    setSyncStatus('local')
  }, [])

  return (
    <AppContext.Provider value={{
      // 다중 아기
      babies, baby, setBaby, addBaby, deleteBaby,
      activeBabyId, setActiveBaby,
      // 기록 (현재 아기 기준 필터링)
      records, addRecord, updateRecord, deleteRecord,
      // 육아일지
      memos, addMemo, deleteMemo,
      // 수면
      activeSleep, startSleep, endSleep,
      // 공유 방
      roomId, roomCode, memberCount,
      createRoom, joinRoom, leaveRoom,
      // 상태
      isOnline, syncStatus,
      patterns: DEFAULT_PATTERNS,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
