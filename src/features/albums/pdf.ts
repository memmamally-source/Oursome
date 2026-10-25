import { fonts } from '@/theme';

import { imageRect } from './edit';
import { layoutById, type Frame, type TextBox } from './layouts';
import type { PrintSpec } from './print';
import { getPhotoBlob } from './storage';
import { themeOf, type Theme } from './templates';
import type { Album, AlbumPage, Crop, PhotoMeta } from './types';

/**
 * Print-ready PDF, made in the browser (nothing is uploaded). Each page is
 * drawn at print resolution from the same saved design the screen uses,
 * then placed full-bleed in the PDF. jsPDF loads only when exporting.
 */

const SERIF = fonts.display;
const SANS = fonts.body;

type Ctx = CanvasRenderingContext2D;
type Box = { x: number; y: number; w: number; h: number }; // pixels

async function loadImage(id: string, preferOriginal: boolean): Promise<ImageBitmap | null> {
  const blob = (preferOriginal && (await getPhotoBlob(id, 'original'))) || (await getPhotoBlob(id, 'display'));
  if (!blob) return null;
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
}

function drawPhoto(ctx: Ctx, img: ImageBitmap | null, box: Box, crop: Crop) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  if (img) {
    const r = imageRect(img.width / img.height, box.w / box.h, crop);
    ctx.drawImage(img, box.x + r.left * box.w, box.y + r.top * box.h, r.width * box.w, r.height * box.h);
  } else {
    ctx.fillStyle = '#E9E1D5';
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.restore();
}

function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

function drawText(
  ctx: Ctx,
  text: string,
  box: Box,
  opts: { font: string; size: number; color: string; align?: TextBox['align']; lineHeight?: number; upper?: boolean; spacing?: number },
) {
  ctx.save();
  ctx.fillStyle = opts.color;
  ctx.font = `${opts.size}px ${opts.font}`;
  ctx.textBaseline = 'top';
  const align = opts.align ?? 'center';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  if (opts.spacing && 'letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${opts.spacing}px`;
  const lh = opts.size * (opts.lineHeight ?? 1.35);
  const lines = wrap(ctx, opts.upper ? text.toUpperCase() : text, box.w);
  const maxLines = Math.max(1, Math.floor(box.h / lh));
  const x = align === 'center' ? box.x + box.w / 2 : align === 'right' ? box.x + box.w : box.x;
  const block = Math.min(lines.length, maxLines) * lh;
  const top = box.h < lh * 3 ? box.y + (box.h - block) / 2 : box.y;
  lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(l, x, top + i * lh));
  ctx.restore();
}

function mounted(ctx: Ctx, frame: Frame, area: Box, theme: Theme, draw: (b: Box) => void) {
  const style = frame.style ?? 'plain';
  const fw = frame.w * area.w;
  const fh = frame.h * area.h;
  const pad = style === 'polaroid' ? fw * 0.05 : style === 'tape' ? fw * 0.025 : 0;
  const bottom = style === 'polaroid' ? pad * 3.2 : pad;
  const outer = { x: area.x + frame.x * area.w - pad, y: area.y + frame.y * area.h - pad, w: fw + pad * 2, h: fh + pad + bottom };
  ctx.save();
  if (frame.rotate) {
    const cx = outer.x + outer.w / 2;
    const cy = outer.y + outer.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((frame.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  if (style !== 'plain') {
    if (!theme.dark) {
      ctx.shadowColor = 'rgba(42,30,23,0.22)';
      ctx.shadowBlur = fw * 0.04;
      ctx.shadowOffsetY = fw * 0.015;
    }
    ctx.fillStyle = theme.mount;
    ctx.fillRect(outer.x, outer.y, outer.w, outer.h);
    ctx.shadowColor = 'transparent';
  }
  draw({ x: outer.x + pad, y: outer.y + pad, w: fw, h: fh });
  if (style === 'tape') {
    const tw = outer.w * 0.22;
    const th = pad * 3;
    for (const [fx, color, rot] of [
      [0.08, 'rgba(229,185,109,0.55)', -8],
      [0.7, 'rgba(135,157,134,0.5)', 7],
    ] as const) {
      ctx.save();
      const x = outer.x + outer.w * fx;
      const y = outer.y - pad * 1.4;
      ctx.translate(x + tw / 2, y + th / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.fillStyle = color;
      ctx.fillRect(-tw / 2, -th / 2, tw, th);
      ctx.restore();
    }
  }
  ctx.restore();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const short = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;

async function drawPage(
  ctx: Ctx,
  area: Box,
  full: Box,
  album: Album,
  page: AlbumPage,
  photos: Map<string, PhotoMeta>,
  number: number,
  original: boolean,
) {
  const theme = themeOf(album.theme);
  const layout = layoutById(page.layout);
  const unit = area.w / 30;
  ctx.fillStyle = theme.page;
  ctx.fillRect(full.x, full.y, full.w, full.h);
  for (let i = 0; i < layout.frames.length; i++) {
    const slot = page.slots[i];
    if (!slot) continue;
    const frame = layout.frames[i];
    const img = await loadImage(slot.photoId, original);
    // Full-page photos reach into the bleed so nothing white shows at the trim.
    const fullPage = frame.x === 0 && frame.y === 0 && frame.w === 1 && frame.h === 1;
    mounted(ctx, frame, fullPage ? full : area, theme, (b) => drawPhoto(ctx, img, b, slot.crop));
    img?.close();
  }
  const box = (t: TextBox): Box => ({ x: area.x + t.x * area.w, y: area.y + t.y * area.h, w: t.w * area.w, h: t.h * area.h });
  if (layout.family === 'timeline' && page.kind === 'photos') {
    layout.frames.forEach((f, i) => {
      const p = page.slots[i] && photos.get(page.slots[i].photoId);
      if (!p?.takenAt) return;
      const b = { x: area.x + 0.06 * area.w, y: area.y + (f.y + f.h / 2) * area.h - unit, w: 0.2 * area.w, h: unit * 2.4 };
      drawText(ctx, short(p.takenAt), { ...b, h: unit * 1.4 }, { font: SERIF, size: unit * 1.1, color: theme.accent, align: 'right' });
      drawText(
        ctx,
        p.takenAt.slice(0, 4),
        { ...b, y: b.y + unit * 1.4, h: unit },
        { font: SANS, size: unit * 0.8, color: theme.muted, align: 'right' },
      );
    });
    ctx.fillStyle = theme.muted;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(area.x + 0.275 * area.w, area.y + 0.06 * area.h, Math.max(1, unit / 12), 0.88 * area.h);
    ctx.globalAlpha = 1;
  }
  if (page.kind !== 'photos') {
    if (layout.title && page.title)
      drawText(ctx, page.title, box(layout.title), {
        font: SERIF,
        size: unit * (page.kind === 'divider' ? 2.4 : 1.6),
        color: theme.ink,
        align: layout.title.align,
      });
    if (layout.note && page.note)
      drawText(
        ctx,
        page.note,
        box(layout.note),
        page.kind === 'divider'
          ? { font: SANS, size: unit * 1.05, color: theme.muted, upper: true, spacing: unit * 0.15, align: layout.note.align }
          : { font: SANS, size: unit * 1.05, color: theme.ink, lineHeight: 1.6, align: layout.note.align },
      );
  } else {
    // Roomy caption corners hold the day when there's no caption (as on screen).
    const dateBox = layout.note ?? (layout.caption && layout.caption.h >= 0.1 ? layout.caption : undefined);
    if (!page.caption && dateBox && page.date) {
      const d = new Date(`${page.date}T12:00:00`);
      drawText(ctx, `${DAYS[d.getDay()]}\n${d.getDate()} ${MONTHS[d.getMonth()]}`, box(dateBox), {
        font: SERIF,
        size: unit * 1.15,
        color: theme.accent,
        align: dateBox.align,
      });
    }
    if (page.caption && layout.caption) {
      if (layout.overlay) {
        ctx.fillStyle = 'rgba(20,14,10,0.38)';
        ctx.fillRect(full.x, area.y + area.h * 0.8, full.w, full.y + full.h - (area.y + area.h * 0.8));
        drawText(
          ctx,
          page.caption,
          { x: area.x + unit * 1.6, y: area.y + area.h * 0.86, w: area.w - unit * 3.2, h: area.h * 0.1 },
          { font: SERIF, size: unit * 1.3, color: '#FFF9F0', align: 'left' },
        );
      } else
        drawText(ctx, page.caption, box(layout.caption), {
          font: SERIF,
          size: unit * 1.05,
          color: theme.muted,
          align: layout.caption.align,
        });
    }
    if (page.title && layout.family !== 'timeline')
      drawText(
        ctx,
        page.title,
        { x: area.x + 0.08 * area.w, y: area.y + 0.015 * area.h, w: 0.84 * area.w, h: unit * 1.4 },
        { font: SERIF, size: unit * 0.95, color: theme.accent, align: 'left' },
      );
  }
  if (!layout.overlay)
    drawText(
      ctx,
      String(number),
      { x: area.x, y: area.y + area.h * 0.975 - unit, w: area.w, h: unit },
      { font: SANS, size: unit * 0.7, color: theme.muted },
    );
}

async function drawCover(ctx: Ctx, area: Box, full: Box, album: Album, photos: Map<string, PhotoMeta>, original: boolean) {
  const theme = themeOf(album.theme);
  const unit = area.w / 30;
  const photo = album.cover.photoId ? photos.get(album.cover.photoId) : undefined;
  const crop = album.cover.crop ?? { x: 0.5, y: 0.45, zoom: 1 };
  const design = photo ? album.cover.design : 'title';
  const fmt = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)} ${iso.slice(0, 4)}`;
  const dates = album.date
    ? album.endDate && album.endDate !== album.date
      ? `${fmt(album.date)} – ${fmt(album.endDate)}`
      : fmt(album.date)
    : '';
  const sub = album.subtitle || album.person?.name || dates;
  const titleBlock = (b: Box, color: string, size: number) => {
    drawText(ctx, album.title, { ...b, h: b.h * 0.65 }, { font: SERIF, size: unit * size, color, lineHeight: 1.15 });
    if (sub)
      drawText(
        ctx,
        sub,
        { ...b, y: b.y + b.h * 0.65, h: b.h * 0.35 },
        { font: SANS, size: unit * 0.95, color, upper: true, spacing: unit * 0.2 },
      );
  };
  const img = photo ? await loadImage(photo.id, original) : null;
  if (design === 'photo') {
    ctx.fillStyle = theme.cover;
    ctx.fillRect(full.x, full.y, full.w, full.h);
    const ph = area.y + area.h * 0.74 - full.y;
    drawPhoto(ctx, img, { x: full.x, y: full.y, w: full.w, h: ph }, crop);
    titleBlock({ x: area.x + unit * 2, y: area.y + area.h * 0.79, w: area.w - unit * 4, h: area.h * 0.17 }, theme.coverInk, 2.3);
  } else if (design === 'framed' || design === 'polaroid') {
    const polaroid = design === 'polaroid';
    ctx.fillStyle = polaroid ? theme.page : theme.cover;
    ctx.fillRect(full.x, full.y, full.w, full.h);
    const fw = area.w * (polaroid ? 0.64 : 0.7);
    const fh = fw * (polaroid ? 0.85 : 0.78);
    const frame: Frame = {
      x: (1 - fw / area.w) / 2,
      y: 0.1,
      w: fw / area.w,
      h: fh / area.h,
      rotate: polaroid ? -2.5 : 0,
      style: 'polaroid',
    };
    if (!polaroid) {
      ctx.fillStyle = theme.mount;
      const pad = unit * 0.3;
      ctx.fillRect(area.x + frame.x * area.w - pad, area.y + frame.y * area.h - pad, fw + pad * 2, fh + pad * 2);
      drawPhoto(ctx, img, { x: area.x + frame.x * area.w, y: area.y + frame.y * area.h, w: fw, h: fh }, crop);
    } else mounted(ctx, frame, area, theme, (b) => drawPhoto(ctx, img, b, crop));
    titleBlock(
      { x: area.x + unit * 2, y: area.y + area.h * 0.1 + fh + area.h * (polaroid ? 0.1 : 0.07), w: area.w - unit * 4, h: area.h * 0.2 },
      polaroid ? theme.ink : theme.coverInk,
      2.6,
    );
  } else {
    ctx.fillStyle = theme.cover;
    ctx.fillRect(full.x, full.y, full.w, full.h);
    ctx.strokeStyle = theme.coverInk;
    ctx.lineWidth = Math.max(1, unit / 10);
    ctx.strokeRect(area.x + unit * 1.6, area.y + unit * 1.6, area.w - unit * 3.2, area.h - unit * 3.2);
    titleBlock({ x: area.x + unit * 3, y: area.y + area.h * 0.38, w: area.w - unit * 6, h: area.h * 0.22 }, theme.coverInk, 2.8);
  }
  img?.close();
}

function drawBack(ctx: Ctx, area: Box, full: Box, album: Album) {
  const theme = themeOf(album.theme);
  const unit = area.w / 30;
  ctx.fillStyle = theme.cover;
  ctx.fillRect(full.x, full.y, full.w, full.h);
  drawText(
    ctx,
    album.title,
    { x: area.x, y: area.y + area.h * 0.86, w: area.w, h: unit * 1.6 },
    { font: SERIF, size: unit * 1.15, color: theme.coverInk },
  );
  drawText(
    ctx,
    'Made with Oursome',
    { x: area.x, y: area.y + area.h * 0.9, w: area.w, h: unit },
    { font: SANS, size: unit * 0.75, color: theme.coverInk },
  );
}

/** Build the PDF. Calls onProgress(done, total) after each page. */
export async function albumPdf(
  album: Album,
  photos: Map<string, PhotoMeta>,
  spec: PrintSpec,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  await document.fonts?.ready;
  const w = spec.trim.w + spec.bleed * 2;
  const h = spec.trim.h + spec.bleed * 2;
  const doc = new jsPDF({ unit: 'in', format: [w, h], orientation: 'portrait', compress: true });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * spec.dpi);
  canvas.height = Math.round(h * spec.dpi);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const full: Box = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const b = spec.bleed * spec.dpi;
  const area: Box = { x: b, y: b, w: canvas.width - 2 * b, h: canvas.height - 2 * b };
  const original = spec.dpi >= 300;
  const total = album.pages.length + 2;
  const add = (first: boolean) => {
    if (!first) doc.addPage([w, h], 'portrait');
    doc.addImage(canvas.toDataURL('image/jpeg', spec.dpi >= 300 ? 0.92 : 0.82), 'JPEG', 0, 0, w, h, undefined, 'FAST');
  };
  await drawCover(ctx, area, full, album, photos, original);
  add(true);
  onProgress?.(1, total);
  for (let i = 0; i < album.pages.length; i++) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await drawPage(ctx, area, full, album, album.pages[i], photos, i + 1, original);
    add(false);
    onProgress?.(i + 2, total);
    // Let the page breathe between pages.
    await new Promise((r) => setTimeout(r, 0));
  }
  drawBack(ctx, area, full, album);
  add(false);
  onProgress?.(total, total);
  doc.setProperties({
    title: album.title,
    creator: 'Oursome',
    subject: `${album.pages.length} pages, ${spec.trim.w} × ${spec.trim.h} in${spec.bleed ? `, ${spec.bleed} in bleed` : ''}`,
  });
  return doc.output('blob');
}
