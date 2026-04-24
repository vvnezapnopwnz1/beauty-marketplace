import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { RootState } from '@app/store'
import { fetchMyProfile, updateMyProfile, type UpdateMePayload, type UserProfile } from '@shared/api/meApi'

interface ProfileState {
  profile: UserProfile | null
  status: 'idle' | 'loading' | 'saving' | 'error'
  error: string | null
  fieldErrors: Record<string, string>
}

const initialState: ProfileState = {
  profile: null,
  status: 'idle',
  error: null,
  fieldErrors: {},
}

export const loadProfile = createAsyncThunk('profile/load', async () => fetchMyProfile())

export const saveProfile = createAsyncThunk(
  'profile/save',
  async (payload: UpdateMePayload, { rejectWithValue }) => {
    try {
      return await updateMyProfile(payload)
    } catch (error) {
      const err = error as Error & { field?: string }
      return rejectWithValue({ message: err.message, field: err.field })
    }
  },
)

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileError: (state) => {
      state.error = null
      state.fieldErrors = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProfile.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.status = 'idle'
        state.profile = action.payload
      })
      .addCase(loadProfile.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.error.message ?? 'Не удалось загрузить профиль'
      })
      .addCase(saveProfile.pending, (state) => {
        state.status = 'saving'
        state.error = null
        state.fieldErrors = {}
      })
      .addCase(saveProfile.fulfilled, (state, action) => {
        state.status = 'idle'
        state.profile = action.payload
      })
      .addCase(saveProfile.rejected, (state, action) => {
        state.status = 'error'
        const payload = action.payload as { message?: string; field?: string } | undefined
        state.error = payload?.message ?? action.error.message ?? 'Не удалось сохранить'
        if (payload?.field) {
          state.fieldErrors[payload.field] = payload.message ?? 'Ошибка поля'
        }
      })
  },
})

export const { clearProfileError } = profileSlice.actions
export const profileReducer = profileSlice.reducer
export const selectProfile = (state: RootState) => state.profile.profile
export const selectProfileStatus = (state: RootState) => state.profile.status
export const selectProfileError = (state: RootState) => state.profile.error
export const selectProfileFieldErrors = (state: RootState) => state.profile.fieldErrors
