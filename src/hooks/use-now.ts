import { useSyncExternalStore } from "react";

// Um único relógio para a tela inteira: cada card lê o mesmo "agora", em vez de ter o próprio setInterval
const TICK_MS = 30_000;

let now = Date.now();
const listeners = new Set<() => void>();
let interval: number | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (interval === undefined) {
    now = Date.now();
    interval = window.setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && interval !== undefined) {
      window.clearInterval(interval);
      interval = undefined;
    }
  };
}

const getSnapshot = () => now;

/** Hora atual em ms, atualizada a cada 30 s por um relógio compartilhado entre todos que usam o hook. */
export const useNow = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
