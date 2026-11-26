import { useEffect, useEffectEvent, useState } from "react";
import { AppState } from "react-native";

const secondsUntil = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

/**
 * Countdown derived from a wall-clock deadline, not from counting ticks, so
 * it stays correct when JS timers are throttled in the background. Fires
 * `onExpire` once when the deadline passes (also right after returning to
 * the app if it passed while away).
 */
export function useCountdown(
  deadline: number | null,
  { onExpire, onTick }: { onExpire?: () => void; onTick?: (secondsLeft: number) => void } = {},
) {
  const [secondsLeft, setSecondsLeft] = useState(() => (deadline ? secondsUntil(deadline) : 0));

  const expire = useEffectEvent(() => onExpire?.());
  const tick = useEffectEvent((left: number) => onTick?.(left));

  useEffect(() => {
    if (deadline === null) return;
    let expired = false;

    const update = () => {
      const left = secondsUntil(deadline);
      setSecondsLeft(left);
      if (left === 0 && !expired) {
        expired = true;
        expire();
      } else if (left > 0) {
        tick(left);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") update();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [deadline]);

  return secondsLeft;
}
