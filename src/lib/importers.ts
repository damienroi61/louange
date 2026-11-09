// Import de présentations : PDF (rendu des pages en images) et PowerPoint.
import type { MediaItem, Presentation, PresentationSlide } from '../types';
import { uid } from './ids';
import { importMediaBlob } from './media';
import { bridge } from './platform';

export type Progress = (done: number, total: number) => void;

export async function pdfToSlides(data: ArrayBuffer, name: string, onProgress?: Progress): Promise<{ slides: PresentationSlide[]; media: MediaItem[] }> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const slides: PresentationSlide[] = [];
  const media: MediaItem[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = 1920 / Math.max(vp1.width, vp1.height * (16 / 9));
    const vp = page.getViewport({ scale: Math.max(scale, 1) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92));
    const m = await importMediaBlob(blob, `${name} — page ${i}.jpg`, 'image');
    if (m) {
      media.push(m);
      slides.push({ id: uid('ps'), kind: 'image', text: '', mediaId: m.id });
    }
    onProgress?.(i, doc.numPages);
  }
  return { slides, media };
}

/** Extraction du texte d'un .pptx (solution de repli sans PowerPoint). */
export async function pptxTextSlides(data: ArrayBuffer): Promise<PresentationSlide[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(data);
  const files = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0], 10) - parseInt(b.match(/\d+/)![0], 10));
  const slides: PresentationSlide[] = [];
  for (const f of files) {
    const xml = await zip.file(f)!.async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const paras = Array.from(doc.getElementsByTagName('a:p'))
      .map((p) =>
        Array.from(p.getElementsByTagName('a:t'))
          .map((t) => t.textContent || '')
          .join(''),
      )
      .filter((t) => t.trim());
    slides.push({ id: uid('ps'), kind: 'text', text: paras.join('\n') });
  }
  return slides;
}

export async function importPresentationFile(file: File, onProgress?: Progress): Promise<Presentation> {
  const name = file.name.replace(/\.[^.]+$/, '');
  const lower = file.name.toLowerCase();
  const now = Date.now();
  const pres: Presentation = { id: uid('p'), title: name, slides: [], createdAt: now, updatedAt: now };

  if (lower.endsWith('.pdf')) {
    pres.slides = (await pdfToSlides(await file.arrayBuffer(), name, onProgress)).slides;
    pres.source = 'PDF';
    return pres;
  }

  if (/\.(pptx?|odp|key)$/.test(lower)) {
    // 1) Dans l'application de bureau : conversion fidèle via PowerPoint ou LibreOffice
    if (bridge) {
      const path = bridge.getPathForFile(file);
      if (path) {
        const r = await bridge.convertPresentation(path);
        if (r.ok && r.files?.length) {
          if (r.kind === 'pdf') {
            const bytes = await bridge.readFile(r.files[0]);
            pres.slides = (await pdfToSlides(bytes.slice().buffer, name, onProgress)).slides;
          } else {
            let i = 0;
            for (const f of r.files) {
              const bytes = await bridge.readFile(f);
              const m = await importMediaBlob(new Blob([bytes.slice()], { type: 'image/png' }), `${name} — ${++i}.png`, 'image');
              if (m) pres.slides.push({ id: uid('ps'), kind: 'image', text: '', mediaId: m.id });
              onProgress?.(i, r.files.length);
            }
          }
          pres.source = 'PowerPoint';
          return pres;
        }
      }
    }
    // 2) Repli : texte des diapositives
    if (lower.endsWith('.pptx')) {
      pres.slides = await pptxTextSlides(await file.arrayBuffer());
      pres.source = 'PowerPoint (texte)';
      return pres;
    }
    throw new Error("Ce format nécessite l'application de bureau avec PowerPoint ou LibreOffice installé.");
  }

  if (file.type.startsWith('image/')) {
    const m = await importMediaBlob(file, file.name, 'image');
    if (m) pres.slides.push({ id: uid('ps'), kind: 'image', text: '', mediaId: m.id });
    pres.source = 'Images';
    return pres;
  }
  throw new Error('Format non pris en charge');
}
