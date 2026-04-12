import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@app/store'
import {
  requestOTP,
  verifyOTP,
  fetchMe,
  logout as logoutApi,
  storeTokens,
  clearTokens,
  getStoredAccessToken,
  type UserInfo,
} from '@shared/api/authApi'

type AuthStep = 'phone' | 'otp'

interface AuthState {
  step: AuthStep
  phone: string
  token: string | null
  user: UserInfo | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  step: 'phone',
  phone: '',
  token: getStoredAccessToken(),
  user: null,
  loading: false,
  error: null,
}

export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (phone: string) => {
    await requestOTP(phone)
    return phone
  },
)

export const confirmOtp = createAsyncThunk(
  'auth/confirmOtp',
  async ({ phone, code }: { phone: string; code: string }) => {
    const result = await verifyOTP(phone, code)
    storeTokens(result.tokenPair)
    return result
  },
)

export const loadMe = createAsyncThunk('auth/loadMe', async () => {
  return fetchMe()
})

export const logout = createAsyncThunk('auth/logout', async () => {
  await logoutApi()
})

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    backToPhone: (state) => {
      state.step = 'phone'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtp.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.loading = false
        state.phone = action.payload
        state.step = 'otp'
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Ошибка отправки кода'
      })

      .addCase(confirmOtp.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(confirmOtp.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.tokenPair.accessToken
        state.user = action.payload.user
        state.step = 'phone'
      })
      .addCase(confirmOtp.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Неверный код'
      })

      .addCase(loadMe.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(loadMe.rejected, (state) => {
        state.token = null
        state.user = null
        clearTokens()
      })

      .addCase(logout.fulfilled, (state) => {
        state.token = null
        state.user = null
        state.step = 'phone'
        state.phone = ''
      })
  },
})

export const { backToPhone } = authSlice.actions

export const selectAuthStep = (state: RootState) => state.auth.step
export const selectAuthPhone = (state: RootState) => state.auth.phone
export const selectAuthLoading = (state: RootState) => state.auth.loading
export const selectAuthError = (state: RootState) => state.auth.error
export const selectIsAuthenticated = (state: RootState) => !!state.auth.token
export const selectUser = (state: RootState) => state.auth.user
export const selectUserRole = (state: RootState) => state.auth.user?.role ?? null
