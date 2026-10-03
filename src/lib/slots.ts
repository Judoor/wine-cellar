/** Row letter: 0 → A, 1 → B… */
export function rowLabel(row: number) {
  return row < 26 ? String.fromCharCode(65 + row) : `R${row + 1}`;
}

/** Slot label like "B3" (row letter + column number). */
export function slotLabel(row: number, col: number) {
  return `${rowLabel(row)}${col + 1}`;
}
