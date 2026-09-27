import { NOTES } from './chords';

export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr0 = Math.cos(ang), wi0 = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cwr - im[i + k + len / 2] * cwi;
        const vi = re[i + k + len / 2] * cwi + im[i + k + len / 2] * cwr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const nwr = cwr * wr0 - cwi * wi0, nwi = cwr * wi0 + cwi * wr0;
        cwr = nwr;
        cwi = nwi;
      }
    }
  }
}

export function chromaOfWindow(samples: Float32Array, sr: number): number[] {
  const N = samples.length;
  const re = Float32Array.from(samples);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] *= 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  fft(re, im);
  const chroma = new Array(12).fill(0);
  for (let k = 1; k < N / 2; k++) {
    const freq = (k * sr) / N;
    if (freq < 80 || freq > 1000) continue;
    const mag = Math.hypot(re[k], im[k]);
    const midi = 69 + 12 * Math.log2(freq / 440);
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pc] += mag;
  }
  const sum = chroma.reduce((a, b) => a + b, 0) || 1;
  return chroma.map(v => v / sum);
}

export function bestChord(chroma: number[]): string {
  let best: string | null = null;
  let bestScore = -1;
  for (let r = 0; r < 12; r++) {
    const maj = chroma[r] + chroma[(r + 4) % 12] + chroma[(r + 7) % 12];
    const min = chroma[r] + chroma[(r + 3) % 12] + chroma[(r + 7) % 12];
    if (maj > bestScore) {
      bestScore = maj;
      best = NOTES[r];
    }
    if (min > bestScore) {
      bestScore = min;
      best = NOTES[r] + 'm';
    }
  }
  return best as string;
}

export interface Segment {
  chord: string;
  start: number;
}

export async function analyzeBuffer(buf: AudioBuffer): Promise<{ segments: Segment[]; duration: number }> {
  const sr = buf.sampleRate;
  const data =
    buf.numberOfChannels > 1
      ? Float32Array.from({ length: buf.length }, (_, i) => (buf.getChannelData(0)[i] + buf.getChannelData(1)[i]) / 2)
      : buf.getChannelData(0);
  const cap = 90,
    total = Math.min(data.length, sr * cap),
    win = 4096,
    hop = 2048;
  const seq: string[] = [];
  for (let pos = 0; pos + win < total; pos += hop) {
    seq.push(bestChord(chromaOfWindow(data.subarray(pos, pos + win), sr)));
  }
  const smoothed = seq.map((_, i) => {
    const sl = seq.slice(Math.max(0, i - 2), i + 3);
    const cnt: Record<string, number> = {};
    sl.forEach(c => {
      cnt[c] = (cnt[c] || 0) + 1;
    });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
  });
  const segments: Segment[] = [];
  let cur: Segment | null = null;
  smoothed.forEach((c, i) => {
    const t = (i * hop) / sr;
    if (!cur || cur.chord !== c) {
      if (cur) segments.push(cur);
      cur = { chord: c, start: t };
    }
  });
  if (cur) segments.push(cur);
  return { segments, duration: buf.duration };
}

export function detectPitch(buf: Float32Array, sr: number): number {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.01) return -1;
  let r1 = 0,
    r2 = buf.length - 1;
  for (let i = 0; i < buf.length / 2; i++) {
    if (Math.abs(buf[i]) < 0.2) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < buf.length / 2; i++) {
    if (Math.abs(buf[buf.length - i]) < 0.2) {
      r2 = buf.length - i;
      break;
    }
  }
  const trimmed = buf.slice(r1, r2);
  const n = trimmed.length;
  const c = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += trimmed[j] * trimmed[j + i];
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxv = -1,
    maxp = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxv) {
      maxv = c[i];
      maxp = i;
    }
  }
  if (maxp <= 0) return -1;
  return sr / maxp;
}
