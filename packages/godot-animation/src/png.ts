import { deflateSync, inflateSync } from "node:zlib";

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

const pngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[index] = value >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff]! ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
  return output;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  return concat([uint32(data.byteLength), typeBytes, data, uint32(crc32(concat([typeBytes, data])))]);
}

function paeth(left: number, up: number, upperLeft: number): number {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  return leftDistance <= upDistance && leftDistance <= upperLeftDistance ? left : upDistance <= upperLeftDistance ? up : upperLeft;
}

export function decodeRgbaPng(bytes: Uint8Array): RgbaImage {
  if (bytes.byteLength < 33 || !pngSignature.every((byte, index) => bytes[index] === byte)) throw new Error("PNG signature is invalid.");
  let offset = pngSignature.byteLength;
  let width = 0; let height = 0; let bitDepth = -1; let colorType = -1; let interlace = -1; let sawHeader = false; let sawEnd = false;
  const compressed: Uint8Array[] = [];
  while (offset + 12 <= bytes.byteLength) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) throw new Error("PNG chunk extends beyond the file.");
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = new TextDecoder("ascii").decode(typeBytes);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = new DataView(bytes.buffer, bytes.byteOffset + offset + 8 + length, 4).getUint32(0, false);
    if (crc32(concat([typeBytes, data])) !== expectedCrc) throw new Error(`PNG ${type} CRC is invalid.`);
    if (type === "IHDR") {
      if (sawHeader || length !== 13) throw new Error("PNG IHDR is invalid.");
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = view.getUint32(0, false); height = view.getUint32(4, false); bitDepth = data[8]!; colorType = data[9]!; interlace = data[12]!; sawHeader = true;
    } else if (type === "IDAT") compressed.push(data);
    else if (type === "IEND") { sawEnd = true; break; }
    offset = end;
  }
  if (!sawHeader || !sawEnd || width < 1 || height < 1) throw new Error("PNG structure is incomplete.");
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) throw new Error(`PNG must be non-interlaced 8-bit RGBA; received depth=${bitDepth} type=${colorType} interlace=${interlace}.`);
  const stride = width * 4;
  const raw = new Uint8Array(inflateSync(concat(compressed)));
  if (raw.byteLength !== (stride + 1) * height) throw new Error("PNG scanline byte count is invalid.");
  const pixels = new Uint8Array(width * height * 4);
  let source = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[source++]!;
    if (filter > 4) throw new Error(`PNG filter ${filter} is unsupported.`);
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[source++]!;
      const left = x >= 4 ? pixels[row + x - 4]! : 0;
      const up = y > 0 ? pixels[row - stride + x]! : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[row - stride + x - 4]! : 0;
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft);
      pixels[row + x] = (encoded + prediction) & 0xff;
    }
  }
  return Object.freeze({ width, height, pixels });
}

export function encodeRgbaPng(image: RgbaImage): Uint8Array {
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1) throw new Error("PNG dimensions must be positive integers.");
  if (image.pixels.byteLength !== image.width * image.height * 4) throw new Error("RGBA pixel byte count does not match PNG dimensions.");
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, image.width, false); headerView.setUint32(4, image.height, false);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0;
  const stride = image.width * 4;
  const raw = new Uint8Array((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) raw.set(image.pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  return concat([pngSignature, chunk("IHDR", header), chunk("IDAT", new Uint8Array(deflateSync(raw, { level: 9 }))), chunk("IEND", new Uint8Array())]);
}
