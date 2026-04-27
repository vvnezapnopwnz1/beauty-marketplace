const KEY = 'activeSalonId'

export function getActiveSalonId(): string | null {
    return localStorage.getItem(KEY)
}

export function setActiveSalonId(salonId: string): void {
    localStorage.setItem(KEY, salonId)
}

export function clearActiveSalonId(): void {
    localStorage.removeItem(KEY)
}
