import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/AppStore'

const useNotificationPermission = () => {
  const {
    state: { notificationPermission },
    ensureNotificationPermission,
    requestNotificationPermission,
  } = useAppStore()

  useEffect(() => {
    if (notificationPermission === 'default') {
      ensureNotificationPermission()
    }
  }, [notificationPermission, ensureNotificationPermission])

  const requestPermission = useCallback(() => requestNotificationPermission(), [requestNotificationPermission])

  return {
    permission: notificationPermission,
    isSupported: notificationPermission !== 'unsupported',
    requestPermission,
    ensurePermissionOnInteraction: ensureNotificationPermission,
  }
}

export default useNotificationPermission
