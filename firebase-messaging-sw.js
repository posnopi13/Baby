// Firebase Cloud Messaging 서비스 워커
// 앱이 백그라운드일 때 FCM 푸시 알림을 수신합니다.
// 주의: 이 파일은 빌드 과정을 거치지 않으므로 import/export 문법을 사용할 수 없습니다.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

// Firebase 설정 (환경 변수를 직접 쓸 수 없으므로 빌드 시 주입 또는 수동 입력 필요)
// vite.config.js에서 inject-manifest 플러그인으로 자동 주입하거나,
// 배포 후 아래 값을 Firebase 콘솔 설정으로 교체하세요.
const FIREBASE_CONFIG = self.__FIREBASE_CONFIG__ || {
  apiKey:            '',
  authDomain:        '',
  projectId:         '',
  storageBucket:     '',
  messagingSenderId: '',
  appId:             '',
}

if (FIREBASE_CONFIG.apiKey) {
  firebase.initializeApp(FIREBASE_CONFIG)
  const messaging = firebase.messaging()

  // 백그라운드 메시지 수신
  messaging.onBackgroundMessage(payload => {
    const { title = '👶 BabyTime', body = '새 기록이 추가됐어요' } = payload.notification || {}
    self.registration.showNotification(title, {
      body,
      icon:  '/Baby/icon-192.png',
      badge: '/Baby/icon-192.png',
      data:  payload.data,
    })
  })

  // 알림 클릭 시 앱 포커스
  self.addEventListener('notificationclick', event => {
    event.notification.close()
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('/Baby/') && 'focus' in client) return client.focus()
        }
        if (clients.openWindow) return clients.openWindow('/Baby/')
      })
    )
  })
}
