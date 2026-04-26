import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import { FilterState } from "./types";


interface AppointmentState {
    filters: FilterState;
    appointmentDrawerData: { mode: 'edit' | 'create'; id: string | null };
}

const initialState: AppointmentState = {
    filters: {
        preset: 'today',
        from: '',
        to: '',
        statuses: [],
        staffId: '',
        serviceId: '',
        search: '',
    },
    appointmentDrawerData: { mode: 'edit', id: null },
};

export const appointmentSlice = createSlice({
    name: 'appointment',
    initialState,
    reducers: {
        openAppointmentDrawer: (
            state,
            {
                payload,
            }: {
                payload: {
                    id: string | null;
                    mode: 'edit' | 'create';
                };
            }
        ) => {
            state.appointmentDrawerData = { mode: payload.mode, id: payload.id };
        },
        closeAppointmentDrawer: (state) => {
            state.appointmentDrawerData = { mode: 'edit', id: null };
        },
        setFilters: (state, action: PayloadAction<FilterState>) => {
            state.filters = action.payload;
        },
        resetFilters: (state) => {
            state.filters = initialState.filters;
        },
    },
})

export const { openAppointmentDrawer, closeAppointmentDrawer, setFilters, resetFilters } = appointmentSlice.actions;