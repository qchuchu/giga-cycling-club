import { Html, Sky } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { RACE_SIZE, type Rider } from './riders'

export type Result = { rider: Rider; time: number }

type RiderState = {
  z: number
  speed: number
  finishTime: number | null
  nextAiTap: number
  cadence: number
}

type Side = 'left' | 'right'

const TRACK_LENGTH = 200
const LANE_WIDTH = 1.6
const ROAD_WIDTH = RACE_SIZE * LANE_WIDTH + 1
const TAP_IMPULSE = 0.9
const DRAG = 0.6
const COUNTDOWN_SECONDS = 3
const RESULTS_DELAY_SECONDS = 1.5
const WHEEL_RADIUS = 0.35

const laneX = (index: number) => (index - (RACE_SIZE - 1) / 2) * LANE_WIDTH

export function Race({
  riders,
  playerIndex,
  hudRoot,
  hudStatus,
  onFinish,
}: {
  riders: Rider[]
  playerIndex: number
  hudRoot: RefObject<HTMLDivElement | null>
  hudStatus: RefObject<HTMLDivElement | null>
  onFinish: (results: Result[]) => void
}) {
  const states = useMemo<RiderState[]>(
    () =>
      riders.map(() => ({ z: 0, speed: 0, finishTime: null, nextAiTap: 0, cadence: 4.5 + Math.random() * 2 })),
    [riders],
  )
  const clock = useRef(-COUNTDOWN_SECONDS)
  const pendingTaps = useRef(0)
  const lastSide = useRef<Side | null>(null)
  const resultsSent = useRef(false)
  const cameraTarget = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const pedal = (side: Side) => {
      if (side === lastSide.current) return
      lastSide.current = side
      pendingTaps.current++
      navigator.vibrate?.(8)
      hudRoot.current?.setAttribute('data-next', side === 'left' ? 'right' : 'left')
    }
    const onPointer = (e: PointerEvent) => pedal(e.clientX < window.innerWidth / 2 ? 'left' : 'right')
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'l') pedal('left')
      if (key === 'arrowright' || key === 'r') pedal('right')
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [hudRoot])

  useFrame(({ camera, size }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    clock.current += delta
    const racing = clock.current >= 0
    const player = states[playerIndex]

    states.forEach((state, index) => {
      let taps = 0
      if (index === playerIndex) {
        taps = pendingTaps.current
        pendingTaps.current = 0
      } else if (racing) {
        state.nextAiTap -= delta
        if (state.nextAiTap <= 0) {
          taps = 1
          state.nextAiTap = (0.8 + Math.random() * 0.4) / state.cadence
        }
      }
      if (!racing || state.finishTime !== null) taps = 0

      state.speed += taps * TAP_IMPULSE * riders[index].power
      state.speed -= state.speed * DRAG * delta
      state.z += state.speed * delta

      if (state.finishTime === null && state.z >= TRACK_LENGTH) {
        const overshootSeconds = (state.z - TRACK_LENGTH) / state.speed
        state.finishTime = clock.current - overshootSeconds
      }
    })

    if (hudStatus.current) hudStatus.current.textContent = statusText(clock.current, player, states)

    if (player.finishTime !== null && !resultsSent.current && clock.current > player.finishTime + RESULTS_DELAY_SECONDS) {
      resultsSent.current = true
      // ponytail: riders still on the road get a time projected from their current speed
      const results = states
        .map((state, index) => ({
          rider: riders[index],
          time: state.finishTime ?? clock.current + (TRACK_LENGTH - state.z) / Math.max(state.speed, 1),
        }))
        .sort((a, b) => a.time - b.time)
      onFinish(results)
    }

    const perspective = camera as THREE.PerspectiveCamera
    const fov = size.width < size.height ? 75 : 55
    if (perspective.fov !== fov) {
      perspective.fov = fov
      perspective.updateProjectionMatrix()
    }
    const cameraX = laneX(playerIndex) * 0.6
    camera.position.lerp(cameraTarget.set(cameraX, 4, -player.z + 8), 1 - Math.exp(-delta * 6))
    camera.lookAt(cameraX, 1, -player.z - 8)
  })

  return (
    <>
      <Sky sunPosition={[50, 30, -100]} />
      <fog attach="fog" args={['#cfe3f0', 30, 140]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 5]} intensity={1.6} />
      <Scenery />
      {riders.map((rider, index) => (
        <Bike key={rider.name} rider={rider} lane={laneX(index)} state={states[index]} />
      ))}
    </>
  )
}

function statusText(clock: number, player: RiderState, states: RiderState[]) {
  if (clock < 0) return String(Math.ceil(-clock))
  if (clock < 0.8) return 'GO!'
  if (player.finishTime !== null) return 'FINISH!'
  const position = 1 + states.filter((state) => state.z > player.z).length
  const metersLeft = Math.ceil(TRACK_LENGTH - player.z)
  const kmh = Math.round(player.speed * 3.6)
  return `${metersLeft} m · P${position}/${states.length}\n${kmh} km/h`
}

function Bike({ rider, lane, state }: { rider: Rider; lane: number; state: RiderState }) {
  const group = useRef<THREE.Group>(null!)
  const wheels = useRef<THREE.Group[]>([])
  const legs = useRef<THREE.Group[]>([])

  useFrame(() => {
    group.current.position.z = -state.z
    const wheelAngle = -state.z / WHEEL_RADIUS
    wheels.current.forEach((wheel) => (wheel.rotation.x = wheelAngle))
    const crankAngle = state.z * 1.2
    legs.current.forEach((leg, i) => (leg.rotation.x = Math.sin(crankAngle + i * Math.PI) * 0.6))
  })

  return (
    <group ref={group} position-x={lane} scale={rider.giga ? 1.25 : 1}>
      {[0.55, -0.55].map((z, i) => (
        <group key={z} ref={(el) => void (el && (wheels.current[i] = el))} position={[0, WHEEL_RADIUS, z]}>
          <mesh rotation-y={Math.PI / 2}>
            <torusGeometry args={[WHEEL_RADIUS, 0.04, 8, 24]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.03, WHEEL_RADIUS * 2, 0.03]} />
            <meshStandardMaterial color="#bbb" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.06, 0.06, 1.1]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 0.95, -0.5]}>
        <boxGeometry args={[0.5, 0.04, 0.04]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {[-0.12, 0.12].map((x, i) => (
        <group key={x} ref={(el) => void (el && (legs.current[i] = el))} position={[x, 0.9, 0.15]}>
          <mesh position={[0, -0.25, 0]}>
            <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.08, 0.02]} rotation-x={-0.6}>
        <capsuleGeometry args={[0.2, 0.45, 4, 8]} />
        <meshStandardMaterial
          color={rider.color}
          emissive={rider.giga ? rider.color : '#000'}
          emissiveIntensity={rider.giga ? 0.6 : 0}
        />
      </mesh>
      <mesh position={[0, 1.48, -0.22]}>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color="#f1c27d" />
      </mesh>
      {rider.giga && <pointLight color={rider.color} intensity={4} distance={4} position={[0, 1.5, 0]} />}
      <Html position={[0, 2.1, 0]} center className="label">
        {rider.name}
      </Html>
    </group>
  )
}

function Scenery() {
  const trees = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const x = side * (ROAD_WIDTH / 2 + 2 + Math.random() * 12)
        return { x, z: 15 - i * 4.5, height: 2 + Math.random() * 2.5 }
      }),
    [],
  )
  const roadLength = TRACK_LENGTH + 120

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, -roadLength / 2]}>
        <planeGeometry args={[400, roadLength + 200]} />
        <meshStandardMaterial color="#6aa84f" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -roadLength / 2 + 20]}>
        <planeGeometry args={[ROAD_WIDTH, roadLength]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {Array.from({ length: RACE_SIZE - 1 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[laneX(i) + LANE_WIDTH / 2, 0.01, -roadLength / 2 + 20]}>
          <planeGeometry args={[0.06, roadLength]} />
          <meshBasicMaterial color="#ddd" />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[ROAD_WIDTH, 0.4]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <FinishArch />
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 1]} />
            <meshStandardMaterial color="#6b4423" />
          </mesh>
          <mesh position={[0, 1 + tree.height / 2, 0]}>
            <coneGeometry args={[tree.height / 3, tree.height, 8]} />
            <meshStandardMaterial color="#2d6a4f" />
          </mesh>
        </group>
      ))}
    </>
  )
}

function FinishArch() {
  const postX = ROAD_WIDTH / 2 + 0.3
  return (
    <group position-z={-TRACK_LENGTH}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[ROAD_WIDTH, 0.8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      {[-postX, postX].map((x) => (
        <mesh key={x} position={[x, 1.75, 0]}>
          <boxGeometry args={[0.2, 3.5, 0.2]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[postX * 2 + 0.2, 0.7, 0.1]} />
        <meshStandardMaterial color="#e63946" />
      </mesh>
      <Html position={[0, 3.5, 0.1]} center transform className="banner">
        FINISH
      </Html>
    </group>
  )
}
