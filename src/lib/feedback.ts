let audioContext: AudioContext | null = null

/** Tres pitidos cortos con WebAudio (sin archivos de audio). */
export function beep() {
  try {
    audioContext ??= new AudioContext()
    const ctx = audioContext
    void ctx.resume()
    for (let i = 0; i < 3; i++) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = i === 2 ? 1320 : 880
      const start = ctx.currentTime + i * 0.25
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.2)
    }
  } catch {
    // Algunos navegadores bloquean el audio sin interacción previa: no es crítico.
  }
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}

/** Desbloquea el audio en iOS: debe llamarse dentro de un gesto del usuario. */
export function primeAudio() {
  try {
    audioContext ??= new AudioContext()
    void audioContext.resume()
  } catch {
    // Sin soporte de audio.
  }
}
