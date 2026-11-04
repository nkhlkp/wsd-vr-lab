import { useEffect, useRef } from 'react'

/** Live set of held key codes. Listed codes don't scroll the page or press focused buttons. */
export function useHeldKeys(captured: readonly string[]) {
  const keys = useRef(new Set<string>())
  const capturedKey = captured.join(',')

  useEffect(() => {
    const codes = new Set(capturedKey.split(','))
    const down = (e: KeyboardEvent) => {
      if (codes.has(e.code)) e.preventDefault()
      keys.current.add(e.code)
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const clear = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [capturedKey])

  return keys
}

/** Calls handler on a fresh (non-repeat) press of any of the codes. */
export function useKeyPress(codes: readonly string[], handler: () => void, enabled = true) {
  const latest = useRef(handler)
  latest.current = handler
  const codesKey = codes.join(',')

  useEffect(() => {
    if (!enabled) return
    const set = new Set(codesKey.split(','))
    const onKey = (e: KeyboardEvent) => {
      if (!set.has(e.code) || e.repeat) return
      e.preventDefault()
      latest.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [codesKey, enabled])
}

// A continuous tone, like the coordination tester's contact buzzer.
let audio: AudioContext | null = null
let tone: OscillatorNode | null = null

export function buzzerOn() {
  if (tone) return
  try {
    audio ??= new AudioContext()
    const gain = audio.createGain()
    gain.gain.value = 0.04
    gain.connect(audio.destination)
    tone = audio.createOscillator()
    tone.type = 'square'
    tone.frequency.value = 220
    tone.connect(gain)
    tone.start()
  } catch {
    tone = null
  }
}

export function buzzerOff() {
  tone?.stop()
  tone = null
}
