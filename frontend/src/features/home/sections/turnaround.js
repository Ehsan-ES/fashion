/**
 * منطق خالص جلوه Hero با مدل hero.glb (۵ نمای یک مدل روی حلقه‌ای از پنل‌ها + پایه نمایشی).
 *
 * مراحل اسکرول (پیشرفت ۰ تا ۱):
 *   ۰ تا ~۰٫۳۶  قطعات از چپ، راست، بالا و پایین می‌آیند و حلقه را کامل می‌کنند.
 *   ۰٫۴۲ تا ۰٫۹۸  حلقه می‌چرخد و پنل‌ها به‌ترتیب (نمای ۱ تا ۵: از روبه‌رو تا پشت) جلوی دوربین می‌آیند.
 */
export const VIEW_COUNT = 5;
export const STEP = (Math.PI * 2) / VIEW_COUNT; // ۷۲ درجه بین پنل‌ها
export const ASSEMBLED = 0.38;      // لباس/حلقه کامل است و هنوز نچرخیده (حالت ثابت prefers-reduced-motion)
export const ROTATE_START = 0.42;
export const ROTATE_END = 0.98;

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
export const localProgress = (p, [start, end]) => clamp01((p - start) / (end - start));

/** نام نود در hero.glb ← جهت ورود در ابتدای اسکرول. نمای ۱ روبه‌روی دوربین است. */
export const PARTS = [
  { id: "view-1", node: "Turnaround_View_1", kind: "view", range: [0.0, 0.26],
    from: { position: [0, 6, 3], rotation: [0.7, 0.0, 0.25] } },                 // از بالا
  { id: "view-2", node: "Turnaround_View_2", kind: "view", range: [0.04, 0.30],
    from: { position: [9, 1, 0], rotation: [0.0, 1.3, -0.5] } },                 // از راست
  { id: "view-5", node: "Turnaround_View_5", kind: "view", range: [0.06, 0.32],
    from: { position: [-9, 1, 0], rotation: [0.0, -1.3, 0.5] } },                // از چپ
  { id: "view-3", node: "Turnaround_View_3", kind: "view", range: [0.08, 0.34],
    from: { position: [7, -5, -3], rotation: [-0.6, 1.0, 0.4] } },               // از پایین راست
  { id: "view-4", node: "Turnaround_View_4", kind: "view", range: [0.10, 0.36],
    from: { position: [-7, -5, -3], rotation: [-0.6, -1.0, -0.4] } },            // از پایین چپ
  { id: "base", node: "Display_Base", kind: "base", range: [0.0, 0.25],
    from: { position: [0, -8, 0], rotation: [0.0, 1.8, 0.0] } },                 // از پایین
];

/** جابه‌جایی و چرخش باقی‌مانده قطعه نسبت به جای نهایی؛ در پایان فاز اول دقیقاً صفر است. */
export function partOffset(part, progress) {
  const k = 1 - easeOutCubic(localProgress(progress, part.range));
  return { position: part.from.position.map((v) => v * k), rotation: part.from.rotation.map((v) => v * k) };
}

/** مقدار نمای جاری (۰ تا ۴) به‌صورت اعشاری؛ ۰ یعنی نمای ۱ روبه‌روی دوربین است. */
export function viewPosition(progress) {
  return clamp01((progress - ROTATE_START) / (ROTATE_END - ROTATE_START)) * (VIEW_COUNT - 1);
}

/**
 * زاویه چرخش حلقه حول محور Y. حرکت بین دو نما نرم است ولی هر نما کمی «می‌ایستد» تا مدل خوانده شود.
 * چرخش منفی، پنل بعدی را به جلوی دوربین می‌آورد.
 */
export function carouselAngle(progress) {
  const r = viewPosition(progress);
  const k = Math.min(Math.floor(r), VIEW_COUNT - 2);
  const f = r - k;
  return 0 - (k + smoothstep(0.18, 0.82, f)) * STEP; // «0 -» تا در شروع -0 برنگردد
}

/** ایندکس (۰ تا ۴) نمایی که الان بیشتر به دوربین رو دارد. */
export const activeView = (progress) => Math.round(viewPosition(progress));

/**
 * ماسک نرم‌کننده لبه‌ها (آلفا در کانال G) تا عکس‌ها با پس‌زمینه تیره Hero محو شوند.
 * margins کسری از عرض/ارتفاع‌اند. خروجی RGBA به طول width*height*4.
 */
export function featherData(width, height, margins) {
  const ramp = (m, x) => (m <= 0 ? 1 : smoothstep(0, m, x));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const a = ramp(margins.left, u) * ramp(margins.right, 1 - u) * ramp(margins.top, v) * ramp(margins.bottom, 1 - v);
      const i = (y * width + x) * 4;
      data[i] = 255;
      data[i + 1] = Math.round(a * 255);
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  return data;
}
