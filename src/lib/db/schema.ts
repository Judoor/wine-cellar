import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const WINE_COLORS = ["red", "white", "rose", "sparkling", "sweet", "fortified"] as const;
export type WineColor = (typeof WINE_COLORS)[number];

export const MOVEMENT_REASONS = [
  "purchase",
  "gift_received",
  "drunk",
  "gifted",
  "broken",
  "other",
] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  locale: text("locale").notNull().default("en"),
  currency: text("currency").notNull().default("EUR"),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    // SHA-256 of the token stored in the browser cookie.
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** A physical location: a cellar, a wine fridge, a cupboard at the parents'... */
export const locations = sqliteTable(
  "locations",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: createdAt(),
  },
  (t) => [index("locations_user_idx").on(t.userId)],
);

/** A grid of slots inside a location (a rack, a shelf, a fridge level). */
export const racks = sqliteTable(
  "racks",
  {
    id: id(),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rows: integer("rows").notNull(),
    // For "pyramid": cols = bottles on the bottom row, each row above holds one less.
    cols: integer("cols").notNull(),
    layout: text("layout", { enum: ["grid", "pyramid"] }).notNull().default("grid"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("racks_location_idx").on(t.locationId)],
);

export const wines = sqliteTable(
  "wines",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    producer: text("producer").notNull(),
    name: text("name"),
    vintage: integer("vintage"),
    color: text("color", { enum: WINE_COLORS }).notNull(),
    country: text("country"),
    region: text("region"),
    appellation: text("appellation"),
    grapes: text("grapes"),
    alcohol: real("alcohol"),
    bottleSizeMl: integer("bottle_size_ml").notNull().default(750),
    purchasePrice: real("purchase_price"),
    estimatedValue: real("estimated_value"),
    drinkFrom: integer("drink_from"),
    peakFrom: integer("peak_from"),
    peakUntil: integer("peak_until"),
    drinkUntil: integer("drink_until"),
    notes: text("notes"),
    imageFile: text("image_file"),
    barcode: text("barcode"),
    // Comma-separated pairing keys (see messages "pairings").
    pairings: text("pairings"),
    createdAt: createdAt(),
  },
  (t) => [index("wines_user_idx").on(t.userId), index("wines_barcode_idx").on(t.userId, t.barcode)],
);

/** One row per physical bottle currently in stock. */
export const bottles = sqliteTable(
  "bottles",
  {
    id: id(),
    wineId: text("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    rackId: text("rack_id").references(() => racks.id, { onDelete: "set null" }),
    row: integer("row"),
    col: integer("col"),
    addedAt: createdAt(),
  },
  (t) => [
    index("bottles_wine_idx").on(t.wineId),
    uniqueIndex("bottles_slot_unique").on(t.rackId, t.row, t.col),
  ],
);

/** Stock history: every bottle that came in or went out. */
export const movements = sqliteTable(
  "movements",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wineId: text("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    direction: text("direction", { enum: ["in", "out"] }).notNull(),
    reason: text("reason", { enum: MOVEMENT_REASONS }).notNull(),
    quantity: integer("quantity").notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),
    note: text("note"),
  },
  (t) => [index("movements_user_idx").on(t.userId), index("movements_wine_idx").on(t.wineId)],
);

export const tastingNotes = sqliteTable(
  "tasting_notes",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wineId: text("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    date: integer("date", { mode: "timestamp" }).notNull(),
    // 0 to 5, half-point steps.
    rating: real("rating"),
    notes: text("notes"),
    occasion: text("occasion"),
    companions: text("companions"),
    createdAt: createdAt(),
  },
  (t) => [index("tasting_notes_wine_idx").on(t.wineId)],
);

export const wishlist = sqliteTable(
  "wishlist",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    producer: text("producer").notNull(),
    name: text("name"),
    vintage: integer("vintage"),
    color: text("color", { enum: WINE_COLORS }),
    appellation: text("appellation"),
    targetPrice: real("target_price"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("wishlist_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Wine = typeof wines.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Rack = typeof racks.$inferSelect;
export type Bottle = typeof bottles.$inferSelect;
