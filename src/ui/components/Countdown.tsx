/**
 * Restzeit bis zum nächsten Tagesrätsel als hh:mm:ss.
 *
 * Eigene kleine Komponente, damit der Sekundentakt nur diese eine Zahl neu
 * zeichnet und nicht den ganzen Bildschirm, in dem sie steht.
 */
import React, { useEffect, useState } from 'react';
import { msUntilNextPuzzle } from '../../game/daily';
import { Text } from './Text';

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${zwei(Math.floor(s / 3600))}:${zwei(Math.floor((s % 3600) / 60))}:${zwei(s % 60)}`;
}

export function Countdown() {
  const [rest, setRest] = useState(() => msUntilNextPuzzle());
  useEffect(() => {
    const id = setInterval(() => setRest(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, []);
  return <Text>{formatCountdown(rest)}</Text>;
}
