import { expect, test } from "vitest";
import {
  ASSEMBLED, PARTS, ROTATE_END, ROTATE_START, STEP, VIEW_COUNT,
  activeView, carouselAngle, featherData, partOffset, viewPosition,
} from "./turnaround";

test("parts map to the nodes of hero.glb (five views and the base)", () => {
  expect(PARTS.filter((p) => p.kind === "view").map((p) => p.node).sort()).toEqual(
    ["Turnaround_View_1", "Turnaround_View_2", "Turnaround_View_3", "Turnaround_View_4", "Turnaround_View_5"]
  );
  expect(PARTS.filter((p) => p.kind === "base").map((p) => p.node)).toEqual(["Display_Base"]);
});

test("parts start far away and are exactly in place when assembled", () => {
  for (const part of PARTS) {
    expect(partOffset(part, 0).position).toEqual(part.from.position);
    expect(Math.hypot(...part.from.position)).toBeGreaterThan(6);
    const done = partOffset(part, ASSEMBLED);
    [...done.position, ...done.rotation].forEach((v) => expect(v).toBeCloseTo(0));
  }
});

test("parts arrive from the left, right, top and bottom", () => {
  const dirs = new Set();
  for (const { from: { position: [x, y] } } of PARTS) {
    if (x <= -6) dirs.add("left");
    if (x >= 6) dirs.add("right");
    if (y >= 5) dirs.add("top");
    if (y <= -5) dirs.add("bottom");
  }
  expect(dirs).toEqual(new Set(["left", "right", "top", "bottom"]));
});

test("assembly ends before the carousel starts to turn", () => {
  for (const { range: [start, end] } of PARTS) {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeLessThanOrEqual(ASSEMBLED);
  }
  expect(ASSEMBLED).toBeLessThan(ROTATE_START);
});

test("parts never move away from their place while assembling", () => {
  for (const part of PARTS) {
    let last = Infinity;
    for (let p = 0; p <= ASSEMBLED; p += 0.02) {
      const d = Math.hypot(...partOffset(part, p).position);
      expect(d).toBeLessThanOrEqual(last + 1e-9);
      last = d;
    }
  }
});

test("carousel stays still during assembly and ends on the last view", () => {
  expect(carouselAngle(0)).toBe(0);
  expect(carouselAngle(ASSEMBLED)).toBe(0);
  expect(carouselAngle(ROTATE_START)).toBeCloseTo(0);
  expect(carouselAngle(ROTATE_END)).toBeCloseTo(-(VIEW_COUNT - 1) * STEP);
  expect(carouselAngle(1)).toBeCloseTo(-(VIEW_COUNT - 1) * STEP);
});

test("carousel only turns one way and dwells on every view", () => {
  let last = 0;
  for (let p = 0; p <= 1.0001; p += 0.005) {
    const a = carouselAngle(p);
    expect(a).toBeLessThanOrEqual(last + 1e-9);
    last = a;
  }
  const span = ROTATE_END - ROTATE_START;
  for (let k = 0; k < VIEW_COUNT; k += 1) {
    // کمی بعد از رسیدن به نمای k، زاویه هنوز تقریباً روی همان نما است
    const p = ROTATE_START + ((k + 0.04) / (VIEW_COUNT - 1)) * span;
    expect(Math.abs(carouselAngle(Math.min(p, 1)) + k * STEP)).toBeLessThan(STEP * 0.05);
  }
});

test("active view follows the scroll", () => {
  expect(activeView(0)).toBe(0);
  expect(activeView(ROTATE_END)).toBe(VIEW_COUNT - 1);
  expect(viewPosition(0)).toBe(0);
  expect(viewPosition(1)).toBe(VIEW_COUNT - 1);
});

test("feather mask is opaque in the middle and transparent at the corners", () => {
  const w = 32, h = 64;
  const data = featherData(w, h, { left: 0.2, right: 0.2, top: 0.1, bottom: 0.05 });
  expect(data).toHaveLength(w * h * 4);
  const alpha = (x, y) => data[(y * w + x) * 4 + 1];
  expect(alpha(16, 32)).toBe(255);
  expect(alpha(0, 0)).toBeLessThan(10);
  expect(alpha(w - 1, h - 1)).toBeLessThan(10);
  expect(alpha(2, 32)).toBeLessThan(alpha(8, 32));
  // حاشیه صفر یعنی بدون محو
  expect(featherData(4, 4, { left: 0, right: 0, top: 0, bottom: 0 })[1]).toBe(255);
});
