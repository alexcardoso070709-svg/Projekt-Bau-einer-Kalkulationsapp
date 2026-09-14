"""
Erzeugt die Spielklänge als WAV-Dateien.

Alles synthetisch: kein Lizenzrisiko, keine Fremdquellen, und die Klänge
lassen sich exakt auf das Spiel abstimmen. Grundlage ist ein glockenartiger
Klang aus Grundton plus Obertönen mit perkussiver Hüllkurve — ein reiner
Sinus klingt dünn und billig, erst die Obertöne geben Körper.
"""
import math
import struct
import wave

# 22050 Hz reicht: Der höchste Oberton im Material liegt bei rund 7,4 kHz,
# die Grenzfrequenz dieser Abtastrate bei 11 kHz. Halbe Dateigröße, kein
# hörbarer Unterschied.
SR = 22050


def huelle(x, attack=0.004, decay=5.0):
    """Schneller Anstieg, exponentielles Ausklingen — perkussiv statt schwebend."""
    if x < attack:
        return x / attack
    return math.exp(-decay * (x - attack))


def glocke(grund, waerme=1.0):
    """
    Obertonreihe eines angeschlagenen Klangkörpers. Der leicht verstimmte
    vierte Teilton (×4.2 statt ×4) ist Absicht: Exakte Vielfache klingen
    steril, die kleine Abweichung macht den Ton lebendig.
    """
    return [
        (grund, 1.0),
        (grund * 2, 0.46 * waerme),
        (grund * 3, 0.2 * waerme),
        (grund * 4.2, 0.09 * waerme),
    ]


def rendere(teiltoene, dauer, amplitude=0.42, decay=5.0, attack=0.004):
    n = int(SR * dauer)
    werte = []
    for i in range(n):
        t = i / SR
        x = t / dauer
        s = sum(a * math.sin(2 * math.pi * f * t) for f, a in teiltoene)
        s /= sum(a for _, a in teiltoene)
        s *= huelle(x, attack, decay) * amplitude
        # Letzte fünf Prozent ausblenden, sonst knackt es beim Dateiende.
        if x > 0.95:
            s *= (1 - x) / 0.05
        werte.append(s)
    return werte


def mische(*spuren):
    laenge = max(len(s) for s in spuren)
    aus = [0.0] * laenge
    for s in spuren:
        for i, v in enumerate(s):
            aus[i] += v
    spitze = max(abs(v) for v in aus) or 1.0
    if spitze > 0.92:
        aus = [v * 0.92 / spitze for v in aus]
    return aus


def schreibe(pfad, werte):
    with wave.open(pfad, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(b''.join(
            struct.pack('<h', int(max(-1.0, min(1.0, v)) * 32767)) for v in werte
        ))


# Pentatonische Leiter (C-Dur ohne Halbtonschritte).
#
# Der eigentliche Grund für diese Wahl: In einer pentatonischen Leiter gibt es
# keine dissonanten Intervalle. Egal welche Töne in welcher Reihenfolge
# erklingen — und bei Kettenreaktionen ist das nicht vorhersehbar — es klingt
# nie schief. Der Spieler spielt beim Verschmelzen unbewusst eine Melodie.
PENTATONIK = [523.25, 587.33, 659.25, 783.99, 880.00,   # C5 D5 E5 G5 A5
              1046.50, 1174.66, 1318.51, 1567.98, 1760.00]  # C6 D6 E6 G6 A6

dateien = {}

# Ablegen: tief und kurz. Er erklingt 90-mal pro Partie und darf deshalb
# keinesfalls aufdringlich sein — nur eine Bestätigung, dass etwas gelandet ist.
dateien['drop'] = rendere(
    [(174.0, 1.0), (348.0, 0.3), (522.0, 0.08)],
    0.16, amplitude=0.3, decay=13.0,
)

# Verschmelzen: je Kettenglied ein Ton höher auf der Leiter.
for i in range(8):
    dateien[f'merge{i + 1}'] = rendere(
        glocke(PENTATONIK[i], waerme=1.0 - i * 0.05),
        0.42 - i * 0.012,
        amplitude=0.38,
        decay=5.4 + i * 0.35,
    )

# Prisma: voller Akkord mit langem Ausklang. Der Höhepunkt des Spiels
# bekommt als einziger Klang einen Quintakkord über zwei Oktaven.
dateien['prisma'] = mische(
    rendere(glocke(523.25), 1.5, amplitude=0.3, decay=2.1),
    rendere(glocke(659.25), 1.5, amplitude=0.26, decay=2.0, attack=0.012),
    rendere(glocke(783.99), 1.5, amplitude=0.24, decay=1.9, attack=0.022),
    rendere(glocke(1046.50), 1.5, amplitude=0.2, decay=1.7, attack=0.034),
)

# Spielende: fallende kleine Terz, weich. Kein Strafklang — niemand soll sich
# schlecht fühlen, weil eine Partie vorbei ist.
dateien['gameover'] = mische(
    rendere(glocke(392.0, 0.7), 1.0, amplitude=0.3, decay=3.2),
    rendere(glocke(329.63, 0.7), 1.0, amplitude=0.3, decay=2.8, attack=0.18),
)

# Knopfdruck: sehr kurz und leise, reine Bestätigung.
dateien['tap'] = rendere(
    [(880.0, 1.0), (1760.0, 0.22)],
    0.06, amplitude=0.16, decay=26.0,
)

import os
ziel = 'assets/sounds'
gesamt = 0
for name, werte in dateien.items():
    pfad = f'{ziel}/{name}.wav'
    schreibe(pfad, werte)
    groesse = os.path.getsize(pfad)
    gesamt += groesse
    print(f'  {name}.wav  {groesse // 1024} KB')
print(f'\n{len(dateien)} Klänge, zusammen {gesamt // 1024} KB')
