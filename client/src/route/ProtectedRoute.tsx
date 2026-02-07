import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { notifications } from '@mantine/notifications' // Import Mantine notifications
import { IconLock } from '@tabler/icons-react' // Optional icon
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import useAuth from '@/utils/hooks/useAuth'

const { unAuthenticatedEntryPath } = appConfig

const ProtectedRoute = () => {
    const { authenticated } = useAuth()
    const location = useLocation()

    useEffect(() => {
        // If not authenticated, trigger the notification
        if (!authenticated) {
            notifications.show({
                id: 'session-expired', // ID prevents duplicate notifications
                title: 'Session Expired',
                message: 'Your session has ended. Please log in again to continue.',
                color: 'red',
                icon: <IconLock size="1.1rem" />,
                autoClose: 5000,
            })
        }
    }, [authenticated])

    if (!authenticated) {
        return (
            <Navigate
                replace
                to={`${unAuthenticatedEntryPath}?${REDIRECT_URL_KEY}=${location.pathname}`}
            />
        )
    }

    return <Outlet />
}

export default ProtectedRoute
