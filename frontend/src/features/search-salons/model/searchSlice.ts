import { createSlice, createSelector } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@app/store'
import type { CategoryId } from '@entities/salon'
import { mockSalons } from '@entities/salon'

interface SearchState {
  query: string
  category: CategoryId
  onlyAvailableToday: boolean
  sortBy: 'distance' | 'rating'
}

const initialState: SearchState = {
  query: '',
  category: 'all',
  onlyAvailableToday: false,
  sortBy: 'distance',
}

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => { state.query = action.payload },
    setCategory: (state, action: PayloadAction<CategoryId>) => { state.category = action.payload },
    toggleAvailableToday: state => { state.onlyAvailableToday = !state.onlyAvailableToday },
    setSortBy: (state, action: PayloadAction<SearchState['sortBy']>) => { state.sortBy = action.payload },
    resetFilters: () => initialState,
  },
})

export const { setQuery, setCategory, toggleAvailableToday, setSortBy, resetFilters } = searchSlice.actions

// Selectors
const selectSearchState = (state: RootState) => state.search

export const selectSearchQuery = (state: RootState) => state.search.query
export const selectSearchCategory = (state: RootState) => state.search.category
export const selectOnlyAvailableToday = (state: RootState) => state.search.onlyAvailableToday
export const selectSortBy = (state: RootState) => state.search.sortBy

export const selectFilteredSalons = createSelector(selectSearchState, ({ query, category, onlyAvailableToday, sortBy }) => {
  let list = mockSalons

  if (category !== 'all') {
    list = list.filter(s => s.category === category)
  }
  if (query.trim()) {
    const q = query.toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.services.some(sv => sv.name.toLowerCase().includes(q)),
    )
  }
  if (onlyAvailableToday) {
    list = list.filter(s => s.availableToday)
  }

  return [...list].sort((a, b) =>
    sortBy === 'rating' ? b.rating - a.rating : a.distanceKm - b.distanceKm,
  )
})
