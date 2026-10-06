import { Canvas } from '@react-three/fiber'
import { useRef, useState, type CSSProperties } from 'react'
import { Race, type Result } from './Race'
import { pickField, ROSTER, type Rider } from './riders'

type Phase =
  | { name: 'select' }
  | { name: 'race'; player: Rider; field: Rider[]; id: number }
  | { name: 'results'; player: Rider; field: Rider[]; id: number; results: Result[] }

const MEDALS = ['🥇', '🥈', '🥉']

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'select' })
  const hudRoot = useRef<HTMLDivElement>(null)
  const hudStatus = useRef<HTMLDivElement>(null)

  const startRace = (player: Rider, field = pickField(player)) =>
    setPhase({ name: 'race', player, field, id: Date.now() })

  if (phase.name === 'select') return <SelectScreen onPick={(player) => startRace(player)} />

  return (
    <>
      <Canvas camera={{ position: [0, 4, 8], fov: 75 }} dpr={[1, 2]}>
        <Race
          key={phase.id}
          riders={phase.field}
          playerIndex={phase.field.indexOf(phase.player)}
          hudRoot={hudRoot}
          hudStatus={hudStatus}
          onFinish={(results) => setPhase({ ...phase, name: 'results', results })}
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
          onRematch={() => startRace(phase.player, phase.field)}
          onChangeRider={() => setPhase({ name: 'select' })}
        />
      )}
    </>
  )
}

function SelectScreen({ onPick }: { onPick: (rider: Rider) => void }) {
  return (
    <div className="overlay">
      <h1>Giga Cycling Club</h1>
      <p>Pick your rider</p>
      <div className="riders">
        {ROSTER.map((rider) => (
          <button
            key={rider.name}
            className="rider-card"
            style={{ '--c': rider.color } as CSSProperties}
            onClick={() => onPick(rider)}
          >
            <span className="swatch" />
            <strong>{rider.name}</strong>
          </button>
        ))}
      </div>
      <p className="hint">Tap left &amp; right (or press L / R) alternately to pedal</p>
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
  player: Rider
  onRematch: () => void
  onChangeRider: () => void
}) {
  const winner = results[0].rider
  const title = winner === player ? 'You won!' : winner.giga ? "You got giga'd 💪" : `P${results.findIndex((r) => r.rider === player) + 1}`

  return (
    <div className="overlay">
      <h1>{title}</h1>
      <ol className="podium">
        {results.map((result, index) => (
          <li key={result.rider.name} className={result.rider === player ? 'me' : ''}>
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
