import { FileType } from '../../types';

export function detectFileType(buffer: ArrayBuffer, fileName: string): FileType {
  const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 4096)));
  const headerStr = Array.from(bytes.slice(0, 512))
    .map((b) => String.fromCharCode(b))
    .join('');

  // 1. PDF Magic Bytes: %PDF-
  if (headerStr.includes('%PDF-') || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    return 'pdf';
  }

  // 2. ZIP container: PK\x03\x04 (could be EPUB, CBZ, or FB2.ZIP)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    // Check if filename says cbz
    if (/\.cbz$/i.test(fileName)) {
      return 'cbz';
    }
    // Search for 'mimetype' or 'epub' or 'container.xml'
    const searchArea = Array.from(bytes.slice(0, 2048)).map((b) => String.fromCharCode(b)).join('');
    if (searchArea.includes('mimetype') || searchArea.includes('epub') || searchArea.includes('OEBPS') || searchArea.includes('container.xml')) {
      return 'epub';
    }
    // Default ZIP heuristic: if contains images -> cbz, else epub
    if (/\.(zip|cbr|cbz)$/i.test(fileName)) {
      return 'cbz';
    }
    return 'epub';
  }

  // 3. MOBI / AZW / AZW3: Palm Database with BOOKMOBI at offset 60
  if (bytes.length >= 68) {
    const typeCreator = String.fromCharCode(bytes[60], bytes[61], bytes[62], bytes[63], bytes[64], bytes[65], bytes[66], bytes[67]);
    if (typeCreator === 'BOOKMOBI' || typeCreator === 'TEXtREAd' || headerStr.includes('MOBI') || /\.mobi$/i.test(fileName)) {
      return 'mobi';
    }
    if (/\.(azw|azw3|kfx)$/i.test(fileName)) {
      return 'azw3';
    }
  }

  // 4. FictionBook 2 (FB2)
  if (headerStr.includes('<FictionBook') || /\.fb2(\.zip)?$/i.test(fileName)) {
    return 'fb2';
  }

  // 5. RTF: {\rtf
  if (headerStr.startsWith('{\\rtf') || /\.rtf$/i.test(fileName)) {
    return 'rtf';
  }

  // 6. HTML
  if (headerStr.includes('<!DOCTYPE html') || headerStr.includes('<html') || /\.(html|htm|xhtml)$/i.test(fileName)) {
    return 'html';
  }

  // 7. Markdown vs Plain Text
  if (/\.(md|markdown)$/i.test(fileName)) {
    return 'md';
  }

  // Fallback by extension
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'epub') return 'epub';
  if (ext === 'mobi') return 'mobi';
  if (ext === 'azw' || ext === 'azw3') return 'azw3';
  if (ext === 'fb2') return 'fb2';
  if (ext === 'cbz') return 'cbz';
  if (ext === 'rtf') return 'rtf';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'md') return 'md';

  return 'txt';
}
