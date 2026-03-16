import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// localStorage에서 런타임 Firebase 설정 로드 (env 파일이 없을 때 대체)
function getLocalConfig() {
  try {
    const stored = localStorage.getItem('bt_firebase_config')
    if (!stored) return null
    const cfg = JSON.parse(stored)
    return (cfg.apiKey && cfg.projectId && !cfg.apiKey.startsWith('your_')) ? cfg : null
  } catch { return null }
}

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isEnvConfigured = Boolean(
  envConfig.apiKey && envConfig.projectId && !envConfig.apiKey.startsWith('your_')
)

const localConfig = !isEnvConfigured ? getLocalConfig() : null
const firebaseConfig = localConfig || envConfig

// Firebase 설정 여부 확인 (env 파일 또는 localStorage에 실제 값이 있어야 true)
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.startsWith('your_')
)

// localStorage에 저장된 VAPID 키 (env 없을 때 대체)
export function getSavedVapidKey() {
  try {
    const cfg = JSON.parse(localStorage.getItem('bt_firebase_config') || '{}')
    return cfg.vapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY
  } catch { return import.meta.env.VITE_FIREBASE_VAPID_KEY }
}

export let db = null
export let messaging = null

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig)

    // 오프라인 지원 (IndexedDB 캐시)
    db = initializeFirestore(app, {
      localCache: persistentLocalCache(),
    })

    // FCM (알림) - HTTPS 환경에서만 동작
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        messaging = getMessaging(app)
      } catch {
        // 개발 환경 등에서 무시
      }
    }
  } catch (e) {
    console.warn('[BabyTime] Firebase 초기화 실패:', e.message)
  }
}

/** 6자리 방 코드 생성 (오해 없는 문자만 사용) */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

/** 기기 고유 ID (새로 고침해도 유지) */
export function getDeviceId() {
  let id = localStorage.getItem('bt_device_id')
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem('bt_device_id', id)
  }
  return id
}

/** FCM 알림 권한 요청 + 토큰 발급 */
export async function requestPushPermission() {
  if (!messaging) return null
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const token = await getToken(messaging, {
      vapidKey: getSavedVapidKey(),
    })
    return token
  } catch {
    return null
  }
}

/** 포그라운드 FCM 메시지 수신 핸들러 등록 */
export function onForegroundMessage(callback) {
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
