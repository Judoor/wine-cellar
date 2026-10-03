/** Row letter: 0 → A, 1 → B… */
export function rowLabel(row: number) {
  return row < 26 ? String.fromCharCode(65 + row) : `R${row + 1}`;
}

/** Slot label like "B3" (row letter + column number). */
export function slotLabel(row: number, col: number) {
  return `${rowLabel(row)}${col + 1}`;
}

type RackShape = { rows: number; cols: number; layout: "grid" | "pyramid" };

/**
 * Number of slots on a row. Rows are numbered from the top; in a pyramid the bottom
 * row holds `cols` bottles and each row above holds one less (bottles rest in the gaps).
 */
export function rowWidth(rack: RackShape, row: number) {
  return rack.layout === "pyramid" ? rack.cols - (rack.rows - 1 - row) : rack.cols;
}

export function slotExists(rack: RackShape, row: number, col: number) {
  return row >= 0 && row < rack.rows && col >= 0 && col < rowWidth(rack, row);
}

export function rackCapacity(rack: RackShape) {
  return rack.layout === "pyramid" ? rack.rows * rack.cols - (rack.rows * (rack.rows - 1)) / 2 : rack.rows * rack.cols;
}
