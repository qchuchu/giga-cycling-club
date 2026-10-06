import { Canvas } from '@react-three/fiber'
import { useRef, useState, type CSSProperties } from 'react'
import { Race, type Result } from './Race'
import { RIDERS } from './riders'

type Phase =
  | { name: 'select' }
  | { name: 'race'; player: number; id: number }
  | { name: 'results'; player: number; id: number; results: Result[] }

const MAX_POWER = Math.max(...RIDERS.map((rider) => rider.power))
const MEDALS = ['🥇', '🥈', '🥉']

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'select' })
  const hudRoot = useRef<HTMLDivElement>(null)
  const hudStatus = useRef<HTMLDivElement>(null)

  const startRace = (player: number) => setPhase({ name: 'race', player, id: Date.now() })

  if (phase.name === 'select') return <SelectScreen onPick={startRace} />

  return (
    <>
      <Canvas camera={{ position: [0, 4, 8], fov: 75 }} dpr={[1, 2]}>
        <Race
          key={phase.id}
          playerIndex={phase.player}
          hudRoot={hudRoot}
          hudStatus={hudStatus}
          onFinish={(results) => setPhase({ name: 'results', player: phase.player, id: phase.id, results })}
        />
      </Canvas>
      {phase.name === 'race' ? (
        <div className="hud" ref={hudRoot}>
          <div className="status" ref={hudStatus} />
          <div className="pads">
            <div className="pad left">L</div>
            <div className="pad right">R</div>
          </div>
        </div>
      ) : (
        <ResultsScreen
          results={phase.results}
          player={phase.player}
          onRematch={() => startRace(phase.player)}
          onChangeRider={() => setPhase({ name: 'select' })}
        />
      )}
    </>
  )
}

function SelectScreen({ onPick }: { onPick: (index: number) => void }) {
  return (
    <div className="overlay">
      <h1>Giga Cycling Club</h1>
      <p>Pick your rider</p>
      <div className="riders">
        {RIDERS.map((rider, index) => (
          <button
            key={rider.name}
            className="rider-card"
            style={{ '--c': rider.color } as CSSProperties}
            onClick={() => onPick(index)}
          >
            <span className="swatch" />
            <strong>{rider.name}</strong>
            <span className="power">
              <span style={{ width: `${(rider.power / MAX_POWER) * 100}%` }} />
            </span>
          </button>
        ))}
      </div>
      <p className="hint">Tap left &amp; right alternately to pedal</p>
    </div>
  )
}

function ResultsScreen({
  results,
  player,
  onRematch,
  onChangeRider,
}: {
  results: Result[]
  player: number
  onRematch: () => void
  onChangeRider: () => void
}) {
  const me = RIDERS[player]
  const winner = results[0].rider
  const title = winner === me ? 'You won!' : winner.giga ? "You got giga'd 💪" : `P${results.findIndex((r) => r.rider === me) + 1}`

  return (
    <div className="overlay">
      <h1>{title}</h1>
      <ol className="podium">
        {results.map((result, index) => (
          <li key={result.rider.name} className={result.rider === me ? 'me' : ''}>
            <span>{MEDALS[index] ?? `${index + 1}.`}</span>
            <span>{result.rider.name}</span>
            <span>{result.time.toFixed(2)}s</span>
          </li>
        ))}
      </ol>
      <div className="actions">
        <button onClick={onRematch}>Rematch</button>
        <button className="secondary" onClick={onChangeRider}>
          Change rider
        </button>
      </div>
    </div>
  )
}
