import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { FinancesState, FinanceSource } from './types'

const today = new Date().toISOString().slice(0, 10)
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const initialState: FinancesState = {
  source: 'all',
  from: thirtyDaysAgo,
  to: today,
}

const financesSlice = createSlice({
  name: 'masterFinances',
  initialState,
  reducers: {
    setFinancesSource(state, action: PayloadAction<FinanceSource>) {
      state.source = action.payload
    },
    setFinancesDateRange(state, action: PayloadAction<{ from: string; to: string }>) {
      state.from = action.payload.from
      state.to = action.payload.to
    },
  },
})

export const { setFinancesSource, setFinancesDateRange } = financesSlice.actions
export const financeReducer = financesSlice.reducer
