/**
 * Toque gerado pelo navegador (sem arquivo de áudio): dois tons de 1s a cada 3s. Devolve a função que para o toque.
 * Sem clique na página antes, o navegador pode bloquear o som; o cartão da ligação continua aparecendo.
 */
export function startRingtone() {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return () => undefined;

  const context = new AudioContextClass();
  let stopped = false;

  const ring = () => {
    if (stopped) return;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, context.currentTime + 0.95);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1);
    gain.connect(context.destination);

    for (const frequency of [440, 480]) {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start();
      oscillator.stop(context.currentTime + 1);
    }
  };

  void context.resume().catch(() => undefined);
  ring();
  const interval = window.setInterval(ring, 3000);

  return () => {
    stopped = true;
    window.clearInterval(interval);
    void context.close().catch(() => undefined);
  };
}
