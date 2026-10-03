"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import { ArrowRightLeft, ExternalLink, GlassWater, LogOut, X } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import type { Rack, WineColor } from "@/lib/db/schema";
import type { PlacedBottle } from "@/lib/services/cellar";
import { rowLabel, rowWidth, slotLabel } from "@/lib/slots";
import { WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";
import { drinkBottle, place, unplace } from "../actions";
import { RackHeader, RackForm } from "./rack-controls";

type Unplaced = { wineId: string; producer: string; name: string | null; vintage: number | null; color: WineColor; count: number };
type Target = { rackId: string; row: number; col: number };
type Mode = { kind: "idle" } | { kind: "placing"; wine: Unplaced } | { kind: "selected"; bottle: PlacedBottle } | { kind: "moving"; bottle: PlacedBottle };
type OptimisticAction = { type: "place"; wine: Unplaced; target: Target } | { type: "move"; bottleId: string; target: Target } | { type: "remove"; bottleId: string };

const wineTitle = (w: { producer: string; vintage: number | null }) => [w.producer, w.vintage].filter(Boolean).join(" ");

export function CellarBoard({
  locationId,
  racks,
  bottles,
  unplaced,
}: {
  locationId: string;
  racks: Rack[];
  bottles: PlacedBottle[];
  unplaced: Unplaced[];
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [dragging, setDragging] = useState<{ color: WineColor } | null>(null);
  const [, startTransition] = useTransition();

  const [state, applyOptimistic] = useOptimistic({ bottles, unplaced }, (s, a: OptimisticAction) => {
    if (a.type === "place") {
      const tmp: PlacedBottle = { id: `tmp-${Math.random()}`, wineId: a.wine.wineId, producer: a.wine.producer, name: a.wine.name, vintage: a.wine.vintage, color: a.wine.color, ...a.target };
      return {
        bottles: [...s.bottles, tmp],
        unplaced: s.unplaced.map((u) => (u.wineId === a.wine.wineId ? { ...u, count: u.count - 1 } : u)).filter((u) => u.count > 0),
      };
    }
    if (a.type === "move") {
      const moving = s.bottles.find((b) => b.id === a.bottleId);
      if (!moving) return s;
      return {
        ...s,
        bottles: s.bottles.map((b) => {
          if (b.id === a.bottleId) return { ...b, ...a.target };
          if (b.rackId === a.target.rackId && b.row === a.target.row && b.col === a.target.col) {
            return { ...b, rackId: moving.rackId, row: moving.row, col: moving.col };
          }
          return b;
        }),
      };
    }
    return { ...s, bottles: s.bottles.filter((b) => b.id !== a.bottleId) };
  });

  const occupant = (target: Target) =>
    state.bottles.find((b) => b.rackId === target.rackId && b.row === target.row && b.col === target.col);

  function placeWine(wine: Unplaced, target: Target) {
    if (occupant(target)) return;
    startTransition(async () => {
      applyOptimistic({ type: "place", wine, target });
      await place({ wineId: wine.wineId }, target);
    });
  }

  function moveBottle(bottle: PlacedBottle, target: Target) {
    startTransition(async () => {
      applyOptimistic({ type: "move", bottleId: bottle.id, target });
      await place({ bottleId: bottle.id }, target);
    });
  }

  function onSlotClick(target: Target) {
    const occ = occupant(target);
    if (mode.kind === "placing") {
      if (occ) return setMode({ kind: "selected", bottle: occ });
      placeWine(mode.wine, target);
      if (mode.wine.count <= 1) setMode({ kind: "idle" });
      else setMode({ kind: "placing", wine: { ...mode.wine, count: mode.wine.count - 1 } });
    } else if (mode.kind === "moving") {
      moveBottle(mode.bottle, target);
      setMode({ kind: "idle" });
    } else if (occ) {
      setMode(mode.kind === "selected" && mode.bottle.id === occ.id ? { kind: "idle" } : { kind: "selected", bottle: occ });
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press to drag on touch screens, so normal swipes still scroll the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  function onDragStart(e: DragStartEvent) {
    setDragging({ color: (e.active.data.current as { color: WineColor }).color });
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const over = e.over?.data.current as Target | undefined;
    const data = e.active.data.current as { wine?: Unplaced; bottle?: PlacedBottle };
    if (!over) return;
    if (data.wine) placeWine(data.wine, over);
    else if (data.bottle) moveBottle(data.bottle, over);
    setMode({ kind: "idle" });
  }

  const selectedId = mode.kind === "selected" || mode.kind === "moving" ? mode.bottle.id : null;

  return (
    // A fixed id keeps dnd-kit's generated aria ids identical on server and client (hydration).
    <DndContext id="cellar-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {(mode.kind === "placing" || mode.kind === "moving") && (
        <div className="oak sticky top-16 z-20 mb-4 flex items-center gap-3 rounded-md px-4 py-3 text-sm shadow-lg md:top-4">
          <span className="min-w-0 flex-1">
            {mode.kind === "placing" ? t("cellar.placing", { wine: wineTitle(mode.wine) }) : t("cellar.moving")}
          </span>
          <button onClick={() => setMode({ kind: "idle" })} className="flex items-center gap-1 rounded bg-white/15 px-3 py-1.5 font-semibold">
            <X className="size-4" aria-hidden /> {t("cellar.cancel")}
          </button>
        </div>
      )}

      <div className="grid select-none grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          {racks.length === 0 && <Card className="py-10 text-center text-sm text-muted">{t("cellar.noRacks")}</Card>}
          {racks.map((rack) => (
            <Card key={rack.id} className="p-4">
              <RackHeader locationId={locationId} rack={rack} filled={state.bottles.filter((b) => b.rackId === rack.id).length} />
              <RackGrid
                rack={rack}
                bottles={state.bottles.filter((b) => b.rackId === rack.id)}
                selectedId={selectedId}
                highlightEmpty={mode.kind === "placing" || mode.kind === "moving" || dragging !== null}
                onSlotClick={onSlotClick}
              />
            </Card>
          ))}
          <Card>
            <h2 className="mb-4 font-serif text-2xl">{t("cellar.newRack")}</h2>
            <RackForm locationId={locationId} />
          </Card>
        </div>

        <div className="order-first space-y-4 lg:order-none">
          <Card className="lg:sticky lg:top-4">
            <h2 className="font-serif text-2xl">{t("cellar.unplaced")}</h2>
            {state.unplaced.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("cellar.unplacedEmpty")}</p>
            ) : (
              <>
                <p className="mt-1 mb-3 text-sm text-muted">{t("cellar.unplacedHint")}</p>
                <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible">
                  {state.unplaced.map((w) => (
                    <UnplacedItem
                      key={w.wineId}
                      wine={w}
                      active={mode.kind === "placing" && mode.wine.wineId === w.wineId}
                      onClick={() => setMode(mode.kind === "placing" && mode.wine.wineId === w.wineId ? { kind: "idle" } : { kind: "placing", wine: w })}
                    />
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>

      {mode.kind === "selected" && (
        <BottleSheet
          bottle={mode.bottle}
          onClose={() => setMode({ kind: "idle" })}
          onMove={() => setMode({ kind: "moving", bottle: mode.bottle })}
          onUnplace={() => {
            const b = mode.bottle;
            setMode({ kind: "idle" });
            startTransition(async () => {
              applyOptimistic({ type: "remove", bottleId: b.id });
              await unplace(b.id);
            });
          }}
          onDrink={() => {
            const b = mode.bottle;
            setMode({ kind: "idle" });
            startTransition(async () => {
              applyOptimistic({ type: "remove", bottleId: b.id });
              await drinkBottle(b.wineId, b.id);
            });
          }}
        />
      )}

      <DragOverlay dropAnimation={null}>{dragging && <BottleDot color={dragging.color} className="size-10 shadow-xl" />}</DragOverlay>
    </DndContext>
  );
}

/* ---------- Rack grid ---------- */

function RackGrid({
  rack,
  bottles,
  selectedId,
  highlightEmpty,
  onSlotClick,
}: {
  rack: Rack;
  bottles: PlacedBottle[];
  selectedId: string | null;
  highlightEmpty: boolean;
  onSlotClick: (t: Target) => void;
}) {
  const at = new Map(bottles.map((b) => [`${b.row}:${b.col}`, b]));

  if (rack.layout === "pyramid") {
    // Rows are centered, so each one sits in the gaps of the row below.
    return (
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="oak inline-flex flex-col gap-0.5 rounded-md p-2 sm:p-3">
          {Array.from({ length: rack.rows }, (_, r) => (
            <div key={r} className="flex items-center gap-1 sm:gap-1.5">
              <span className="w-5 shrink-0 text-center text-[10px] font-semibold opacity-60">{rowLabel(r)}</span>
              <div className="flex flex-1 justify-center gap-1 sm:gap-1.5">
                {Array.from({ length: rowWidth(rack, r) }, (_, c) => (
                  <Slot
                    key={c}
                    target={{ rackId: rack.id, row: r, col: c }}
                    bottle={at.get(`${r}:${c}`)}
                    selected={at.get(`${r}:${c}`)?.id === selectedId}
                    highlightEmpty={highlightEmpty}
                    onClick={onSlotClick}
                    className="w-9 sm:w-11"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        className="oak inline-grid gap-1 rounded-md p-2 sm:gap-1.5 sm:p-3"
        style={{ gridTemplateColumns: `1.25rem repeat(${rack.cols}, minmax(2.25rem, 2.75rem))` }}
      >
        <span />
        {Array.from({ length: rack.cols }, (_, c) => (
          <span key={c} className="text-center text-[10px] font-semibold opacity-60">
            {c + 1}
          </span>
        ))}
        {Array.from({ length: rack.rows }, (_, r) => (
          <RackRow key={r} r={r} rack={rack} at={at} selectedId={selectedId} highlightEmpty={highlightEmpty} onSlotClick={onSlotClick} />
        ))}
      </div>
    </div>
  );
}

function RackRow({
  r,
  rack,
  at,
  selectedId,
  highlightEmpty,
  onSlotClick,
}: {
  r: number;
  rack: Rack;
  at: Map<string, PlacedBottle>;
  selectedId: string | null;
  highlightEmpty: boolean;
  onSlotClick: (t: Target) => void;
}) {
  return (
    <>
      <span className="flex items-center justify-center text-[10px] font-semibold opacity-60">{rowLabel(r)}</span>
      {Array.from({ length: rack.cols }, (_, c) => (
        <Slot
          key={c}
          target={{ rackId: rack.id, row: r, col: c }}
          bottle={at.get(`${r}:${c}`)}
          selected={at.get(`${r}:${c}`)?.id === selectedId}
          highlightEmpty={highlightEmpty}
          onClick={onSlotClick}
        />
      ))}
    </>
  );
}

function Slot({
  target,
  bottle,
  selected,
  highlightEmpty,
  onClick,
  className,
}: {
  target: Target;
  bottle?: PlacedBottle;
  selected: boolean;
  highlightEmpty: boolean;
  onClick: (t: Target) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${target.rackId}:${target.row}:${target.col}`, data: target });
  const label = slotLabel(target.row, target.col);
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onClick(target)}
      title={bottle ? `${label} · ${wineTitle(bottle)}` : label}
      aria-label={bottle ? `${t("cellar.slot", { slot: label })}: ${wineTitle(bottle)}` : t("cellar.slot", { slot: label })}
      className={clsx(
        "relative flex aspect-square items-center justify-center rounded-full bg-[#1d130c] shadow-[inset_0_3px_6px_rgb(0_0_0/0.6)] transition",
        isOver && "ring-2 ring-[#f0b860]",
        !bottle && highlightEmpty && "bg-[#2c1d12] ring-1 ring-[#f0b860]/40",
        className,
      )}
    >
      {bottle && <PlacedBottleDot bottle={bottle} selected={selected} />}
    </button>
  );
}

function PlacedBottleDot({ bottle, selected }: { bottle: PlacedBottle; selected: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `bottle:${bottle.id}`,
    data: { bottle, color: bottle.color },
    disabled: bottle.id.startsWith("tmp-"),
  });
  return (
    <span ref={setNodeRef} {...listeners} {...attributes} role="presentation" tabIndex={-1} className="absolute inset-[3px]">
      <BottleDot color={bottle.color} className={clsx("size-full", isDragging && "opacity-30", selected && "ring-2 ring-[#f0b860] ring-offset-2 ring-offset-[#1d130c]")} />
    </span>
  );
}

/** A bottle seen from the front of the rack: a colored disc with a glass highlight. */
export function BottleDot({ color, className }: { color: WineColor; className?: string }) {
  const fill = WINE_COLOR_STYLES[color].fill;
  return (
    <span
      className={clsx("block rounded-full border border-black/30", className)}
      style={{ background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.55), transparent 35%), ${fill}` }}
    />
  );
}

/* ---------- Unplaced list & bottle sheet ---------- */

function UnplacedItem({ wine, active, onClick }: { wine: Unplaced; active: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `wine:${wine.wineId}`, data: { wine, color: wine.color } });
  return (
    <li className="shrink-0 lg:shrink">
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        type="button"
        onClick={onClick}
        className={clsx(
          "flex w-56 items-center gap-3 rounded border bg-surface px-3 py-2 text-left transition lg:w-full",
          active ? "border-accent bg-accent-soft" : "border-border hover:border-accent",
          isDragging && "opacity-50",
        )}
      >
        <BottleDot color={wine.color} className="size-7 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{wine.producer}</span>
          <span className="block truncate text-xs text-muted">{[wine.name, wine.vintage].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="font-serif text-lg">×{wine.count}</span>
      </button>
    </li>
  );
}

function BottleSheet({
  bottle,
  onClose,
  onMove,
  onUnplace,
  onDrink,
}: {
  bottle: PlacedBottle;
  onClose: () => void;
  onMove: () => void;
  onUnplace: () => void;
  onDrink: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 md:inset-x-auto md:right-6 md:bottom-6 md:w-96">
      <Card className="bg-surface shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <BottleDot color={bottle.color} className="size-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("cellar.slot", { slot: slotLabel(bottle.row, bottle.col) })}</p>
            <p className="truncate font-serif text-xl">{bottle.producer}</p>
            <p className="truncate text-sm text-muted">{[bottle.name, bottle.vintage].filter(Boolean).join(" · ")}</p>
          </div>
          <button onClick={onClose} aria-label={t("common.cancel")} className="rounded p-1 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onDrink}>
            <GlassWater className="size-4" aria-hidden /> {t("cellar.drink")}
          </Button>
          <Button variant="secondary" onClick={onMove}>
            <ArrowRightLeft className="size-4" aria-hidden /> {t("cellar.move")}
          </Button>
          <Button variant="secondary" onClick={onUnplace}>
            <LogOut className="size-4" aria-hidden /> {t("cellar.unplace")}
          </Button>
          <Link href={`/wines/${bottle.wineId}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-2">
            <ExternalLink className="size-4" aria-hidden /> {t("cellar.openWine")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
