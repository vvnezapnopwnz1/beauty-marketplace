import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface StaffState {
  selectedStaffId: string | null
}

const initialState: StaffState = {
  selectedStaffId: null,
}

export const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    setSelectedStaffId: (state, action: PayloadAction<string | null>) => {
      state.selectedStaffId = action.payload
    },
  },
})

export const { setSelectedStaffId } = staffSlice.actions
