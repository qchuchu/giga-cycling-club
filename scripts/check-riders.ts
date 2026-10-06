import assert from 'node:assert/strict'
import { pickField, RACE_SIZE, ROSTER } from '../src/riders.ts'

const laReine = ROSTER.find((rider) => rider.giga)!
for (const player of ROSTER) {
  for (let run = 0; run < 200; run++) {
    const field = pickField(player)
    assert.equal(field.length, RACE_SIZE)
    assert.equal(new Set(field).size, RACE_SIZE)
    assert.ok(field.includes(player))
    assert.ok(field.includes(laReine))
  }
}
console.log('riders ok')
