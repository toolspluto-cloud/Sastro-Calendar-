import { isAllDayEvent, isSameLocalDay, localFractionalHour } from "./datetime";

/** Pure layout for the day rail (06:00 to 24:00). Safe to import on the client. */
export const RAIL_START = 6;
export const RAIL_END = 24;
export const ROW = 52; // px per hour
export const RAIL_HEIGHT = (RAIL_END - RAIL_START) * ROW;

const CHIP_STEP = 22; // chip height plus gap
const MIN_EVENT_PX = 26;
const PARKED_HOURS = 0.75;
const EVENT_GAP_PX = 4;

export function hourTop(hour: number) {
  return (hour - RAIL_START) * ROW;
}

/** Stack chips from their start hour; a chip never lands on the one above it. */
export function layoutChips<T extends { startHour: number }>(chips: T[]) {
  let nextFree = 0;
  return [...chips]
    .sort((a, b) => a.startHour - b.startHour)
    .map((chip) => {
      const top = Math.max(hourTop(Math.max(RAIL_START, chip.startHour)) + 4, nextFree);
      nextFree = top + CHIP_STEP;
      return { chip, top };
    });
}

export type EventBox = { startHour: number; top: number; height: number; compact: boolean };

/** Where an event sits on the rail. All-day or pre-6am events park at the top. */
export function eventBox(start: string, end: string): EventBox {
  const startHour = localFractionalHour(start);
  const endsLaterDay = !isSameLocalDay(end, new Date(`${start.slice(0, 10)}T12:00:00`));
  const allDay = isAllDayEvent(start);
  const endHour = !allDay && end && endsLaterDay ? RAIL_END : localFractionalHour(end);

  let from = Math.max(RAIL_START, startHour);
  let to = Math.min(RAIL_END, endHour);
  if (allDay || (startHour < RAIL_START && endHour <= RAIL_START)) {
    from = RAIL_START;
    to = RAIL_START + PARKED_HOURS;
  } else if (to <= from) {
    to = Math.min(RAIL_END, from + 0.5);
  }
  const height = Math.max(MIN_EVENT_PX, (to - from) * ROW - EVENT_GAP_PX);
  return { startHour: from, top: hourTop(from), height, compact: height < 40 };
}

const MAX_LANES = 2; // a third lane is unreadable at phone width

/** Overlapping events share lanes; any beyond the limit go behind a "+N" button. */
export function layoutEvents<T extends { start: string; end: string }>(events: T[]) {
  const boxes = events
    .map((event) => ({
      event,
      box: eventBox(event.start, event.end),
      lane: 0,
      lanes: 1,
      cluster: 0,
      extra: false,
    }))
    .sort((a, b) => a.box.top - b.box.top);

  let cluster: typeof boxes = [];
  let clusterBottom = -1;
  let clusterId = 0;
  const closeCluster = () => {
    const laneBottoms: number[] = [];
    for (const item of cluster) {
      const free = laneBottoms.findIndex((bottom) => bottom <= item.box.top);
      item.lane = free === -1 ? laneBottoms.length : free;
      laneBottoms[item.lane] = item.box.top + item.box.height;
    }
    for (const item of cluster) {
      item.lanes = Math.min(laneBottoms.length, MAX_LANES);
      item.extra = item.lane >= MAX_LANES;
      item.cluster = clusterId;
    }
    clusterId += 1;
    cluster = [];
  };

  for (const item of boxes) {
    if (item.box.top >= clusterBottom) {
      closeCluster();
      clusterBottom = -1;
    }
    cluster.push(item);
    clusterBottom = Math.max(clusterBottom, item.box.top + item.box.height);
  }
  closeCluster();
  return boxes;
}

const BREATHER_PART = [8, 2, 7, 5, 6, 4, 3]; // eighth of daylight, Sunday first

/** The day's fixed-daylight Breather window. Mirrors rahuKaalWindow for the client. */
export function breatherWindow(day: Date) {
  const startHour = 6 + (BREATHER_PART[day.getDay()] - 1) * 1.5;
  return { startHour, endHour: startHour + 1.5 };
}

export function startsInBreather(start: string, day: Date) {
  if (isAllDayEvent(start)) return false;
  const hour = localFractionalHour(start);
  const { startHour, endHour } = breatherWindow(day);
  return hour >= startHour && hour < endHour;
}
