// Shared activity calculations. Timers use elapsed wall time to tolerate background tabs.
export const MOODS = [
  ['excited', '\u{1F929}'],
  ['happy', '\u{1F60A}'],
  ['good', '\u{1F642}'],
  ['calm', '\u{1F60C}'],
  ['okay', '\u{1F610}'],
  ['tired', '\u{1F634}'],
  ['worried', '\u{1F61F}'],
  ['sad', '\u{1F614}'],
  ['angry', '\u{1F620}'],
  ['terrible', '\u{1F622}'],
];

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function remainingSeconds(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatTimer(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function breathingState(elapsedSeconds) {
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  const position = elapsed % 19;
  return {
    phase: position < 4 ? 'Inhale' : position < 11 ? 'Hold' : 'Exhale',
    remaining:
      position < 4 ? 4 - position : position < 11 ? 11 - position : 19 - position,
    cycles: Math.floor(elapsed / 19),
  };
}
