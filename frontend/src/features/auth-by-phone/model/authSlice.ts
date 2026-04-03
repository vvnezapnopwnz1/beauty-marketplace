import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@app/store'

type AuthStep = 'phone' | 'otp'

interface AuthState {
  step: AuthStep
  phone: string
  token: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  step: 'phone',
  phone: '',
  token: null,
  loading: false,
  error: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPhone: (state, action: PayloadAction<string>) => {
      state.phone = action.payload
      state.error = null
    },
    requestOtpStart: state => { state.loading = true; state.error = null },
    requestOtpSuccess: state => { state.loading = false; state.step = 'otp' },
    requestOtpFail: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    verifyOtpStart: state => { state.loading = true; state.error = null },
    verifyOtpSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.token = action.payload
      state.step = 'phone'
    },
    verifyOtpFail: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    backToPhone: state => { state.step = 'phone'; state.error = null },
  },
})

export const {
  setPhone,
  requestOtpStart,
  requestOtpSuccess,
  requestOtpFail,
  verifyOtpStart,
  verifyOtpSuccess,
  verifyOtpFail,
  backToPhone,
} = authSlice.actions

export const selectAuthStep = (state: RootState) => state.auth.step
export const selectAuthPhone = (state: RootState) => state.auth.phone
export const selectAuthLoading = (state: RootState) => state.auth.loading
export const selectAuthError = (state: RootState) => state.auth.error
export const selectIsAuthenticated = (state: RootState) => !!state.auth.token
