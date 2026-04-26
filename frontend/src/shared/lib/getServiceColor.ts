export const SVC_COLORS = [
    '#D4547A',
    '#7A5AC4',
    '#2A9E6A',
    '#C4800A',
    '#4A90D4',
    '#C06040',
    '#A07890',
    '#5ABFA0',
]

export function getServiceColor(name: string): string {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i)
    return SVC_COLORS[Math.abs(h) % SVC_COLORS.length]
}