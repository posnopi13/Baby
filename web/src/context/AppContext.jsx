import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Default patterns (matching Android PatternEntity)
export const DEFAULT_PATTERNS = [
  { id: 'p1', name: '분유', category: 'FOOD', subType: 'FORMULA', icon: '🍼', color: '#FF8FA3', hasAmount: true, amountUnit: 'ml' },
  { id: 'p2', name: '모유', category: 'FOOD', subType: 'BREAST_MILK', icon: '🤱', color: '#FFB3CE', hasAmount: true, amountUnit: 'ml' },
  { id: 'p3', name: '이유식', category: 'FOOD', subType: 'BABY_FOOD', icon: '🥣', color: '#FFCC80', hasAmount: true, amountUnit: 'g' },
  { id: 'p4', name: '밤잠', category: 'SLEEP', subType: 'NIGHT_SLEEP', icon: '🌙', color: '#7B68EE', hasAmount: false },
  { id: 'p5', name: '낮잠', category: 'SLEEP', subType: 'NAP', icon: '😴', color: '#9B8FFF', hasAmount: false },
  { id: 'p6', name: '쉬', category: 'DIAPER', subType: 'PEE', icon: '💧', color: '#64C8A0', hasAmount: false },
  { id: 'p7', name: '응가', category: 'DIAPER', subType: 'POOP', icon: '💩', color: '#A8D8A8', hasAmount: false },
  { id: 'p8', name: '약', category: 'MEDICATION', subType: 'MEDICATION', icon: '💊', color: '#FFB347', hasAmount: false },
]

const AppContext = createContext(null)

function loadFromStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function AppProvider({ children }) {
  const [baby, setBabyState] = useState(() => loadFromStorage('bt_baby', null))
  const [records, setRecordsState] = useState(() => loadFromStorage('bt_records', []))
  const [memos, setMemosState] = useState(() => loadFromStorage('bt_memos', []))
  const [activeSleep, setActiveSleepState] = useState(() => loadFromStorage('bt_active_sleep', null))

  const setBaby = useCallback((b) => {
    setBabyState(b)
    saveToStorage('bt_baby', b)
  }, [])

  const addRecord = useCallback((record) => {
    setRecordsState(prev => {
      const next = [record, ...prev]
      saveToStorage('bt_records', next)
      return next
    })
  }, [])

  const deleteRecord = useCallback((id) => {
    setRecordsState(prev => {
      const next = prev.filter(r => r.id !== id)
      saveToStorage('bt_records', next)
      return next
    })
  }, [])

  const addMemo = useCallback((memo) => {
    setMemosState(prev => {
      const next = [memo, ...prev]
      saveToStorage('bt_memos', next)
      return next
    })
  }, [])

  const deleteMemo = useCallback((id) => {
    setMemosState(prev => {
      const next = prev.filter(m => m.id !== id)
      saveToStorage('bt_memos', next)
      return next
    })
  }, [])

  const startSleep = useCallback((patternId) => {
    const sleep = { id: Date.now().toString(), patternId, startTime: Date.now() }
    setActiveSleepState(sleep)
    saveToStorage('bt_active_sleep', sleep)
  }, [])

  const endSleep = useCallback(() => {
    if (!activeSleep) return null
    const record = { ...activeSleep, endTime: Date.now() }
    addRecord(record)
    setActiveSleepState(null)
    saveToStorage('bt_active_sleep', null)
    return record
  }, [activeSleep, addRecord])

  return (
    <AppContext.Provider value={{
      baby, setBaby,
      records, addRecord, deleteRecord,
      memos, addMemo, deleteMemo,
      activeSleep, startSleep, endSleep,
      patterns: DEFAULT_PATTERNS,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
