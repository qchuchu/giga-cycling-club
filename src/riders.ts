export type Rider = {
  name: string
  color: string
  power: number
  giga?: boolean
}

export const RIDERS: Rider[] = [
  { name: 'Rider A', color: '#e63946', power: 1 },
  { name: 'Rider B', color: '#457b9d', power: 1.05 },
  { name: 'Rider C', color: '#2a9d8f', power: 0.95 },
  { name: 'THE GIGA', color: '#ffd60a', power: 3.5, giga: true },
]
