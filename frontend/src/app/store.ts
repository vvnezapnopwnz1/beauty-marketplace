import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { searchSlice } from '@features/search-salons/model/searchSlice'
import { authSlice } from '@features/auth-by-phone/model/authSlice'

export const store = configureStore({
  reducer: {
    search: searchSlice.reducer,
    auth: authSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
