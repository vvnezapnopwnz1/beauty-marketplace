import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@app/store'
import type { CategoryId } from '@entities/salon'

interface SearchState {
  query: string
  category: CategoryId
  onlyAvailableToday: boolean
  onlineOnly: boolean
  openNow: boolean
  highRating: boolean
  sortBy: 'popular' | 'nearby' | 'rating'
}

const initialState: SearchState = {
  query: '',
  category: 'hair',
  onlyAvailableToday: false,
  onlineOnly: false,
  openNow: false,
  highRating: false,
  sortBy: 'popular',
}

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => { state.query = action.payload },
    setCategory: (state, action: PayloadAction<CategoryId>) => { state.category = action.payload },
    toggleAvailableToday: state => { state.onlyAvailableToday = !state.onlyAvailableToday },
    toggleOnlineOnly: state => { state.onlineOnly = !state.onlineOnly },
    toggleOpenNow: state => { state.openNow = !state.openNow },
    toggleHighRating: state => { state.highRating = !state.highRating },
    setSortBy: (state, action: PayloadAction<SearchState['sortBy']>) => { state.sortBy = action.payload },
    resetFilters: () => initialState,
  },
})

export const {
  setQuery,
  setCategory,
  toggleAvailableToday,
  toggleOnlineOnly,
  toggleOpenNow,
  toggleHighRating,
  setSortBy,
  resetFilters,
} = searchSlice.actions

export const selectSearchQuery = (state: RootState) => state.search.query
export const selectSearchCategory = (state: RootState) => state.search.category
export const selectOnlyAvailableToday = (state: RootState) => state.search.onlyAvailableToday
export const selectOnlineOnly = (state: RootState) => state.search.onlineOnly
export const selectOpenNow = (state: RootState) => state.search.openNow
export const selectHighRating = (state: RootState) => state.search.highRating
export const selectSortBy = (state: RootState) => state.search.sortBy
