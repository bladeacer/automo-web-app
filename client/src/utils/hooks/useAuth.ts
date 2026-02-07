import { setUser, signInSuccess, signOutSuccess } from '@/store'
import appConfig from '@/configs/app.config'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useNavigate } from 'react-router-dom'
import type { SignInCredential, SignUpCredential } from '@/@types/auth'
import { AuthService } from "@/services/auth/auth.service"
import useQuery from './useQuery'
import { useAppDispatch, useAppSelector } from '@/store/hook'

export default function useAuth() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const query = useQuery()
    const { token, signedIn } = useAppSelector((state) => state.auth.session)

    const signIn = async (values: SignInCredential) => {
        try {
            const resp = await AuthService.signIn(values.username, values.password)
            
            if (resp && resp.access_token) {
                // 1. Set Session (signedIn: true)
                dispatch(signInSuccess({
                    token: resp.access_token,
                    refreshToken: '',
                    expireTime: Date.now() + 3600000
                }))

                // 2. Set User Data
                dispatch(setUser({
                    fullName: resp.fullName || resp.username,
                    email: resp.email,
                    role: resp.authority || ['USER'],
                    phoneNumber: resp.phoneNumber || ''
                }))

                // 3. Handle Intelligent Redirection
                const redirectUrl = query.get(REDIRECT_URL_KEY)
                navigate(redirectUrl ? redirectUrl : appConfig.authenticatedEntryPath)

                return {
                    status: 'success',
                    message: ''
                }
            }
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.error || errors.toString()
            }
        }
    }

    const signUp = async (values: SignUpCredential) => {
        try {
            const resp = await AuthService.signUp(
                values.username, 
                values.email, 
                values.password, 
                values.name
            )
            return resp
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.error || errors.toString()
            }
        }
    }

    const handleSignOut = () => {
        dispatch(signOutSuccess())
        dispatch(setUser({ fullName: '', role: [], email: '' }))
        navigate(appConfig.unAuthenticatedEntryPath)
    }

    return {
        authenticated: !!token && signedIn,
        signIn,
        signUp,
        signOut: handleSignOut,
    }
}
