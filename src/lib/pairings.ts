/** Food pairing keys (labels in messages "pairings"). */
export const PAIRING_KEYS = [
  "beef", "lamb", "veal", "pork", "poultry", "game", "curedMeat", "richFish", "leanFish", "shellfish", "pasta",
  "spicy", "vegetarian", "mushrooms", "softCheese", "hardCheese", "agedCheese", "blueCheese", "goatCheese",
  "appetizer", "dessert", "fruitDessert",
] as const;

export type PairingKey = (typeof PAIRING_KEYS)[number];

export function parsePairings(value: string | null | undefined): PairingKey[] {
  return (value ?? "").split(",").filter((p): p is PairingKey => (PAIRING_KEYS as readonly string[]).includes(p));
}
