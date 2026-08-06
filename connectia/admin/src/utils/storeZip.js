/**
 * ZIP mínimo (método STORE, sin comprimir) para descarga masiva en el browser.
 * @param {{ name: string, data: ArrayBuffer | Uint8Array }[]} entries
 * @returns {Blob}
 */
export function buildStoreZip(entries) {
  const parts = []
  const central = []
  let offset = 0
  let count = 0

  for (const entry of entries || []) {
    const name = sanitizeZipName(entry?.name)
    if (!name) continue
    const data = toU8(entry.data)
    const crc = crc32(data)
    const nameBytes = encodeUtf8(name)
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8
    lv.setUint16(8, 0, true) // store
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0, true)
    lv.setUint32(14, crc >>> 0, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)

    const cen = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, crc >>> 0, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset >>> 0, true)
    cen.set(nameBytes, 46)

    parts.push(local, data)
    central.push(cen)
    offset += local.length + data.length
    count += 1
  }

  const centralSize = central.reduce((n, b) => n + b.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, count, true)
  ev.setUint16(10, count, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}

function sanitizeZipName(raw) {
  let name = String(raw || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\.(\/|$)/g, '_')
    .trim()
  if (!name || name.endsWith('/')) return ''
  return name.slice(0, 180)
}

function toU8(data) {
  if (!data) return new Uint8Array(0)
  if (data instanceof Uint8Array) return data
  return new Uint8Array(data)
}

function encodeUtf8(str) {
  return new TextEncoder().encode(str)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}
