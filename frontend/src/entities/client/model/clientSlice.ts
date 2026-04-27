import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ClientFilterState } from './types'

interface ClientDrawerData {
  mode: 'view' | 'create' | null
  id: string | null
}

interface ClientState {
  filters: ClientFilterState
  clientDrawerData: ClientDrawerData
}

const initialState: ClientState = {
  filters: {
    search: '',
    tagIds: [],
    includeDead: false,
  },
  clientDrawerData: {
    mode: null,
    id: null,
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
    openClientDrawer: (
      state,
      action: PayloadAction<{ mode: 'view' | 'create'; id?: string | null }>,
    ) => {
      state.clientDrawerData = {
        mode: action.payload.mode,
        id: action.payload.id ?? null,
      }
    },
    closeClientDrawer: state => {
      state.clientDrawerData = { mode: null, id: null }
    },
  },
})

export const { setClientFilters, resetClientFilters, openClientDrawer, closeClientDrawer } =
  clientSlice.actions
