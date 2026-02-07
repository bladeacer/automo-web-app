import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'

export interface SessionState {
    signedIn: boolean
    token: string | null
    expireTime: number | null
    refreshToken: string | null
}

const initialState: SessionState = {
    signedIn: false,
    token: null,
    expireTime: null,
    refreshToken: null
}

const sessionSlice = createSlice({
    name: `${SLICE_BASE_NAME}/session`,
    initialState,
    reducers: {
        // Updated to make secondary fields optional to match current Flask response
        signInSuccess(state, action: PayloadAction<{ token: string; expireTime?: number; refreshToken?: string }>) {
            state.signedIn = true
            state.token = action.payload.token
            state.expireTime = action.payload.expireTime || null
            state.refreshToken = action.payload.refreshToken || null
        },
        signOutSuccess(state) {
            state.signedIn = false
            state.token = null
            state.refreshToken = null
            state.expireTime = null
        },
        updateSession(state, action: PayloadAction<{ token: string; expireTime?: number; refreshToken?: string }>) {
            state.token = action.payload.token
            if (action.payload.expireTime) state.expireTime = action.payload.expireTime
            if (action.payload.refreshToken) state.refreshToken = action.payload.refreshToken
        },
    },
})

export const { signInSuccess, signOutSuccess, updateSession } = sessionSlice.actions
export default sessionSlice.reducer
