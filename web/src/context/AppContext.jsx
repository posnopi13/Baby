import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
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

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [baby,        setBabyState]        = useState(() => load('bt_baby',         null))
  const [records,     setRecordsState]     = useState(() => load('bt_records',       []))
  const [memos,       setMemosState]       = useState(() => load('bt_memos',         []))
  const [activeSleep, setActiveSleepState] = useState(() => load('bt_active_sleep',  null))
  const [roomId,      setRoomIdState]      = useState(() => load('bt_room_id',       null))
  const [roomCode,    setRoomCodeState]    = useState(() => load('bt_room_code',     null))
  const [memberCount, setMemberCount]      = useState(1)
  const [syncStatus,  setSyncStatus]       = useState('local') // 'local'|'syncing'|'synced'|'error'
  const [isOnline,    setIsOnline]         = useState(navigator.onLine)

  // 연결 직후 초기 데이터를 알림에서 제외하기 위한 타임스탬프
  const connectedAt = useRef(0)

  // ─ 온/오프라인 감지
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // ─ Firestore 실시간 리스너
  useEffect(() => {
    if (!roomId || !isFirebaseConfigured || !db) return

    setSyncStatus('syncing')
    connectedAt.current = Date.now()
    const myId = getDeviceId()

    // 기록 리스너
    const unsubRecords = onSnapshot(
      collection(db, 'families', roomId, 'records'),
      snap => {
        const data = snap.docs
          .map(d => ({ ...d.data(), id: d.id }))
          .sort((a, b) => b.startTime - a.startTime)
        setRecordsState(data)
        save('bt_records', data)
        setSyncStatus('synced')

        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return
          const r = change.doc.data()
          // 연결 후 4초 이상 지난 새 기록만 알림 (초기 로드 제외)
          if (Date.now() - connectedAt.current > 4000 && r.createdBy && r.createdBy !== myId) {
            notifyPartner('record', r)
          }
        })
      },
      () => setSyncStatus('error')
    )

    // 육아일지 리스너
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

    // 가족 문서 (아기 정보, activeSleep, 인원 수)
    const unsubFamily = onSnapshot(
      doc(db, 'families', roomId),
      snap => {
        if (!snap.exists()) return
        const d = snap.data()
        if (d.baby !== undefined)         { setBabyState(d.baby);              save('bt_baby',         d.baby)         }
        if (d.activeSleep !== undefined)  { setActiveSleepState(d.activeSleep); save('bt_active_sleep', d.activeSleep) }
        if (d.memberCount !== undefined)    setMemberCount(d.memberCount)
      }
    )

    return () => { unsubRecords(); unsubMemos(); unsubFamily() }
  }, [roomId])

  // ─── 아기 정보 저장
  const setBaby = useCallback(async b => {
    setBabyState(b)
    save('bt_baby', b)
    if (roomId && db) await setDoc(doc(db, 'families', roomId), { baby: b }, { merge: true })
  }, [roomId])

  // ─── 기록 추가
  const addRecord = useCallback(async record => {
    const enriched = { ...record, createdBy: getDeviceId(), createdAt: Date.now() }
    setRecordsState(prev => {
      const next = [enriched, ...prev].sort((a, b) => b.startTime - a.startTime)
      save('bt_records', next)
      return next
    })
    if (roomId && db) await setDoc(doc(db, 'families', roomId, 'records', record.id), enriched)
  }, [roomId])

  // ─── 기록 수정
  const updateRecord = useCallback(async (id, updates) => {
    setRecordsState(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r)
        .sort((a, b) => b.startTime - a.startTime)
      save('bt_records', next)
      return next
    })
    if (roomId && db) {
      const current = records.find(r => r.id === id)
      if (current) await setDoc(doc(db, 'families', roomId, 'records', id), { ...current, ...updates })
    }
  }, [roomId, records])

  // ─── 기록 삭제
  const deleteRecord = useCallback(async id => {
    setRecordsState(prev => { const n = prev.filter(r => r.id !== id); save('bt_records', n); return n })
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
    const s = { id: Date.now().toString(), patternId, startTime: Date.now() }
    setActiveSleepState(s)
    save('bt_active_sleep', s)
    if (roomId && db) await setDoc(doc(db, 'families', roomId), { activeSleep: s }, { merge: true })
  }, [roomId])

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

    await setDoc(doc(db, 'rooms', code),        { familyId, createdAt: Date.now() })
    await setDoc(doc(db, 'families', familyId), { baby: baby || {}, activeSleep: null, memberCount: 1, createdAt: Date.now() })

    const myId = getDeviceId()
    for (const r of records)
      await setDoc(doc(db, 'families', familyId, 'records', r.id), { ...r, createdBy: myId, createdAt: Date.now() })
    for (const m of memos)
      await setDoc(doc(db, 'families', familyId, 'memos', m.id),   { ...m, createdBy: myId, createdAt: Date.now() })

    setRoomIdState(familyId)
    setRoomCodeState(code)
    save('bt_room_id',   familyId)
    save('bt_room_code', code)
    return code
  }, [baby, records, memos])

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
      baby, setBaby,
      records, addRecord, updateRecord, deleteRecord,
      memos, addMemo, deleteMemo,
      activeSleep, startSleep, endSleep,
      roomId, roomCode, memberCount,
      createRoom, joinRoom, leaveRoom,
      isOnline, syncStatus,
      patterns: DEFAULT_PATTERNS,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
