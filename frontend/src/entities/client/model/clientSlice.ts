import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ClientFilterState } from './types'

interface ClientState {
  filters: ClientFilterState
}

const initialState: ClientState = {
  filters: {
    search: '',
    tagIds: [],
  },
}

export const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    setClientFilters: (state, action: PayloadAction<ClientFilterState>) => {
      state.filters = action.payload
    },
    resetClientFilters: state => {
      state.filters = initialState.filters
    },
  },
})

export const { setClientFilters, resetClientFilters } = clientSlice.actions
