const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Quacks are shown rounded down, with thousands separators. */
export function formatQuacks(value: number): string {
  return whole.format(Math.floor(value));
}

/** Production rates are shown with one decimal. */
export function formatRate(value: number): string {
  return oneDecimal.format(value);
}

/** A gained amount: one decimal while small, whole numbers after that. */
export function formatGain(value: number): string {
  return value < 100 ? oneDecimal.format(Math.floor(value * 10) / 10).replace(/\.0$/, '') : formatQuacks(value);
}
