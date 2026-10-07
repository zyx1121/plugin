// Measure and match 3 photo statistics on an image:
//   rb    highlight R-B: mean(R - B) over the brightest 5% of pixels (colour of the light)
//   black near-black ratio: share of pixels with luma < 16 (depth of the shadows)
//   grain grain sigma: std of high-pass luma residual in the flattest regions (sensor noise)
//
// Usage: copy into a work dir and `bun add sharp` once (auto-install hangs on its native binary)
//   bun realism.ts measure <img...>
//   bun realism.ts diff <ai> <ref>                       which stats are off vs a real reference
//   bun realism.ts fix <in> <out.png> --ref <ref>        fix only the stats flagged by diff
//   bun realism.ts fix <in> <out.png> <rb> <black> <grain>   explicit targets, "-" skips a step
//   output format follows the extension; prefer .png, JPEG re-encoding eats grain
//   bun realism.ts compare <before> <after> <out.jpg> [cropX] [cropY]
import sharp from "sharp";

type Img = { w: number; h: number; px: Float32Array }; // RGB, 0..255
type Stats = { rb: number; black: number; grain: number };
type Target = { rb: number | null; black: number | null; grain: number | null };

// fitTo: downscale so the long edge matches, so grain is compared at the same scale
async function load(path: string, fitTo?: number): Promise<Img> {
  let s = sharp(path).rotate().removeAlpha();
  if (fitTo) s = s.resize(fitTo, fitTo, { fit: "inside", withoutEnlargement: true });
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: Float32Array.from(data) };
}

const luma = (p: Float32Array, i: number) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];

function lumaPlane(img: Img) {
  const y = new Float32Array(img.w * img.h);
  for (let k = 0; k < y.length; k++) y[k] = luma(img.px, k * 3);
  return y;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < w) { s += src[y * w + xx]; n++; } }
      tmp[y * w + x] = s / n;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
      out[y * w + x] = s / n;
    }
  return out;
}

function quantile(arr: Float32Array, q: number) {
  const s = Float32Array.from(arr).sort();
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

export function measure(img: Img): Stats {
  const Y = lumaPlane(img), n = Y.length;
  const t = quantile(Y, 0.95);
  let rb = 0, cnt = 0;
  for (let k = 0; k < n; k++) if (Y[k] >= t) { rb += img.px[k * 3] - img.px[k * 3 + 2]; cnt++; }
  let blk = 0;
  for (let k = 0; k < n; k++) if (Y[k] < 16) blk++;
  // grain: residual of a 3x3 blur, read where the 7x7 local texture is flattest (bottom 10%)
  const b1 = boxBlur(Y, img.w, img.h, 1), b3 = boxBlur(b1, img.w, img.h, 3);
  const sq = new Float32Array(n);
  for (let k = 0; k < n; k++) sq[k] = (b1[k] - b3[k]) ** 2;
  const tex = boxBlur(sq, img.w, img.h, 3), flat = quantile(tex, 0.1);
  let s2 = 0, m = 0;
  for (let k = 0; k < n; k++) if (tex[k] <= flat && Y[k] > 20 && Y[k] < 235) { s2 += (Y[k] - b1[k]) ** 2; m++; }
  // a 3x3 box residual of white noise keeps sqrt(8/9) of its std
  const grain = Math.sqrt(s2 / Math.max(m, 1)) / Math.sqrt(8 / 9);
  return { rb: +(rb / cnt).toFixed(2), black: +(blk / n).toFixed(4), grain: +grain.toFixed(2) };
}

// Thresholds for "visibly off"; inside them a stat is left alone.
export function diff(ai: Stats, ref: Stats): Target {
  const rbOff = Math.abs(ai.rb - ref.rb) > 8;
  const blackOff = Math.abs(ai.black - ref.black) > 0.005 &&
    (ai.black < ref.black * 0.5 || ai.black > ref.black * 2 + 0.001);
  // grain can only be added, never removed
  const grainOff = ref.grain - ai.grain > 0.5;
  return { rb: rbOff ? ref.rb : null, black: blackOff ? ref.black : null, grain: grainOff ? ref.grain : null };
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

// Shadow toe: b > 0 deepens values below 96, b < 0 lifts them; midtones and highlights stay put.
// A linear levels cut instead darkens the whole frame.
function toe(src: Float32Array, b: number) {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = clamp(src[i] - b * Math.max(0, 1 - src[i] / 96) ** 2);
  return out;
}

function shiftHighlights(img: Img, delta: number) {
  const p = img.px;
  for (let i = 0; i < p.length; i += 3) {
    const w = Math.min(1, Math.max(0, (luma(p, i) / 255 - 0.55) / 0.4)) ** 2;
    p[i] = clamp(p[i] + (w * delta) / 2);
    p[i + 2] = clamp(p[i + 2] - (w * delta) / 2);
  }
}

// seeded Gaussian (Box-Muller) so runs are reproducible
function rng(seed: number) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) + 0.5) / 2 ** 32;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

function addGrain(img: Img, sigma: number, seed = 1) {
  const n = img.w * img.h, g = rng(seed);
  const raw = new Float32Array(n), chroma = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) raw[k] = g();
  for (let k = 0; k < n * 2; k++) chroma[k] = g();
  // clump slightly (grain larger than a pixel), then renormalise to unit std
  const nb = boxBlur(raw, img.w, img.h, 1);
  let v = 0;
  for (let k = 0; k < n; k++) v += nb[k] ** 2;
  const norm = Math.sqrt(v / n), p = img.px;
  for (let k = 0; k < n; k++) {
    const amp = sigma * (0.6 + 0.8 * Math.sqrt(1 - luma(p, k * 3) / 255)); // more noise in shadows, like a sensor
    const L = (nb[k] / norm) * amp;
    p[k * 3] = clamp(p[k * 3] + L + chroma[k * 2] * amp * 0.25);
    p[k * 3 + 1] = clamp(p[k * 3 + 1] + L);
    p[k * 3 + 2] = clamp(p[k * 3 + 2] + L + chroma[k * 2 + 1] * amp * 0.25);
  }
}

export function fix(src: Img, target: Target) {
  const img: Img = { ...src, px: Float32Array.from(src.px) };
  // order matters: tone first, colour second, grain last
  if (target.black !== null) {
    let lo = -60, hi = 60;
    for (let it = 0; it < 16; it++) {
      const mid = (lo + hi) / 2;
      measure({ ...img, px: toe(img.px, mid) }).black < target.black ? (lo = mid) : (hi = mid);
    }
    img.px = toe(img.px, (lo + hi) / 2);
  }
  // two passes: the weight ramp under-applies on the first
  if (target.rb !== null) for (let it = 0; it < 2; it++) shiftHighlights(img, target.rb - measure(img).rb);
  const base = measure(img).grain;
  if (target.grain !== null && base < target.grain) {
    // the metric under-reads clumped grain, so calibrate the amplitude against the metric itself
    const want = Math.sqrt(target.grain ** 2 - base ** 2);
    let amp = want, out = img;
    for (let it = 0; it < 4; it++) {
      out = { ...img, px: Float32Array.from(img.px) };
      addGrain(out, amp);
      amp *= want / Math.sqrt(Math.max(measure(out).grain ** 2 - base ** 2, 0.01));
    }
    return out;
  }
  return img;
}

async function save(img: Img, path: string) {
  const buf = Buffer.from(Uint8Array.from(img.px, (v) => Math.round(v)));
  const s = sharp(buf, { raw: { width: img.w, height: img.h, channels: 3 } });
  // PNG keeps the measured stats exactly; JPEG (even q92) halves fine grain, so .jpg is q97 4:4:4
  await (path.endsWith(".png") ? s.png() : s.jpeg({ quality: 97, chromaSubsampling: "4:4:4" })).toFile(path);
}

async function loadPair(ai: string, ref: string) {
  const a = await load(ai);
  return { a, r: await load(ref, Math.max(a.w, a.h)) };
}

if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);
  const out = (o: unknown) => console.log(JSON.stringify(o));
  if (cmd === "measure") {
    for (const p of args) out({ file: p, ...measure(await load(p)) });
  } else if (cmd === "diff") {
    const { a, r } = await loadPair(args[0], args[1]);
    const ai = measure(a), ref = measure(r);
    out({ ai, ref, fix: diff(ai, ref) });
  } else if (cmd === "fix") {
    const [inp, dst, ...rest] = args;
    const before = await load(inp);
    let target: Target;
    if (rest[0] === "--ref") {
      const r = await load(rest[1], Math.max(before.w, before.h));
      target = diff(measure(before), measure(r));
    } else {
      const num = (v?: string) => (v === undefined || v === "-" ? null : +v);
      target = { rb: num(rest[0]), black: num(rest[1]), grain: num(rest[2]) };
    }
    if (target.rb === null && target.black === null && target.grain === null) {
      out({ file: inp, before: measure(before), skipped: "nothing to fix" });
    } else {
      await save(fix(before, target), dst);
      out({ file: inp, target, before: measure(before), after: measure(await load(dst)) });
    }
  } else if (cmd === "compare") {
    // top row full frames, bottom row 384px crops upscaled 4:3 so grain is visible
    const [a, b, dst, cx = "320", cy = "320"] = args;
    const full = (p: string) => sharp(p).resize(512, 512, { fit: "cover" }).toBuffer();
    const crop = (p: string) => sharp(p).extract({ left: +cx, top: +cy, width: 384, height: 384 })
      .resize(512, 512, { kernel: "nearest" }).toBuffer();
    await sharp({ create: { width: 1032, height: 1032, channels: 3, background: "#000" } })
      .composite([
        { input: await full(a), left: 0, top: 0 }, { input: await full(b), left: 520, top: 0 },
        { input: await crop(a), left: 0, top: 520 }, { input: await crop(b), left: 520, top: 520 },
      ])
      .jpeg({ quality: 92 }).toFile(dst);
    out({ compare: dst });
  } else {
    console.error("usage: measure | diff | fix | compare (see header)");
    process.exit(1);
  }
}
