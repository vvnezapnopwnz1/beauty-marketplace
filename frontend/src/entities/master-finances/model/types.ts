
export type FinanceSource = 'all' | 'personal' | 'salon'

export interface FinancesState {
    source: FinanceSource
    from: string
    to: string
}
