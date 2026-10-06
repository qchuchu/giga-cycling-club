export type Rider = {
  name: string
  color: string
  power: number
  giga?: boolean
}

export const RACE_SIZE = 4

export const ROSTER: Rider[] = [
  { name: 'La Reine', color: '#ffd60a', power: 3.5, giga: true },
  { name: 'Val', color: '#e63946', power: 1 },
  { name: 'Chuche', color: '#457b9d', power: 1 },
  { name: 'RemK', color: '#2a9d8f', power: 1 },
  { name: 'Bobby', color: '#f4a261', power: 1 },
  { name: 'El Segre', color: '#9b5de5', power: 1 },
  { name: 'Walt', color: '#f15bb5', power: 1 },
]

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function pickField(player: Rider): Rider[] {
  const giga = ROSTER.find((rider) => rider.giga)!
  const others = shuffle(ROSTER.filter((rider) => rider !== player && rider !== giga))
  const field = player === giga ? [player, ...others] : [player, giga, ...others]
  return shuffle(field.slice(0, RACE_SIZE))
}

