import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { searchSlice } from '@features/search-salons/model/searchSlice'
import { authSlice } from '@features/auth-by-phone/model/authSlice'
import { locationSlice } from '@features/location/model/locationSlice'
import { profileReducer } from '@features/edit-profile/model/profileSlice'
import { appointmentSlice } from '@entities/appointment/model/appointmentSlice'
import { rtkApi } from '@shared/api/rtkApi'

export const store = configureStore({
  reducer: {
    search: searchSlice.reducer,
    auth: authSlice.reducer,
    location: locationSlice.reducer,
    profile: profileReducer,
    appointment: appointmentSlice.reducer,
    [rtkApi.reducerPath]: rtkApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(rtkApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
