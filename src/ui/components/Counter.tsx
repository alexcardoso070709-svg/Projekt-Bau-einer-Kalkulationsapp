/**
 * Zahl, die auf ihren neuen Wert hochzählt.
 *
 * Ein Punktestand, der springt, wird übersehen; einer, der hochläuft, wird
 * gelesen. Das ist der billigste Weg, einen guten Zug spürbar zu machen.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { formatNumber } from '../../game/share';
import { numberLocale } from '../../i18n/strings';

export interface CounterProps {
  value: number;
  testID?: string;
  style?: TextStyle | TextStyle[];
  duration?: number;
  locale?: string;
}

export function Counter({ value, testID, style, duration = 420, locale = numberLocale }: CounterProps) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (value === shown) return;
    const start = Date.now();
    const startValue = from.current;
    const delta = value - startValue;

    if (raf.current) clearInterval(raf.current);
    raf.current = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      // Weiches Auslaufen: schnell los, sanft ankommen.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(startValue + delta * eased));
      if (t >= 1) {
        if (raf.current) clearInterval(raf.current);
        raf.current = null;
        from.current = value;
      }
    }, 16);

    return () => {
      if (raf.current) clearInterval(raf.current);
      raf.current = null;
      from.current = value;
    };
    // shown bewusst nicht in den Abhängigkeiten: sonst startet jede
    // Zwischenstufe der Animation eine neue Animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <Text testID={testID} style={style}>
      {formatNumber(shown, locale)}
    </Text>
  );
}
