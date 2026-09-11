/**
 * 极简 ZIP 打包器：store 模式（不压缩）+ 流式输出。
 * 成品是 webp，再压也几乎没收益，反倒吃 CPU；不压缩还能边读边发，
 * 内存里同时只留一个文件。
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

interface Entry {
  name: string;
  data: Uint8Array;
}

export interface ZipSource {
  name: string;
  load: () => Promise<Uint8Array>;
}

export function zipStream(sources: ZipSource[], date = new Date()): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const central: Uint8Array[] = [];
  let offset = 0;
  let i = 0;
  let count = 0;

  const { time, date: dd } = dosTime(date);

  const localHeader = (e: Entry, crc: number, nameBytes: Uint8Array) => {
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);          // version needed
    h.setUint16(6, 0x0800, true);      // UTF-8 文件名
    h.setUint16(8, 0, true);           // store
    h.setUint16(10, time, true);
    h.setUint16(12, dd, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, e.data.length, true);
    h.setUint32(22, e.data.length, true);
    h.setUint16(26, nameBytes.length, true);
    h.setUint16(28, 0, true);
    return new Uint8Array(h.buffer);
  };

  const centralHeader = (e: Entry, crc: number, nameBytes: Uint8Array, off: number) => {
    const h = new DataView(new ArrayBuffer(46));
    h.setUint32(0, 0x02014b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 20, true);
    h.setUint16(8, 0x0800, true);
    h.setUint16(10, 0, true);
    h.setUint16(12, time, true);
    h.setUint16(14, dd, true);
    h.setUint32(16, crc, true);
    h.setUint32(20, e.data.length, true);
    h.setUint32(24, e.data.length, true);
    h.setUint16(28, nameBytes.length, true);
    h.setUint32(42, off, true);
    const out = new Uint8Array(46 + nameBytes.length);
    out.set(new Uint8Array(h.buffer), 0);
    out.set(nameBytes, 46);
    return out;
  };

  return new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      if (i < sources.length) {
        const src = sources[i++];
        let data: Uint8Array;
        try {
          data = await src.load();
        } catch {
          return; // 单个文件缺失就跳过，不要让整个导出失败
        }
        const entry: Entry = { name: src.name, data };
        const nameBytes = enc.encode(entry.name);
        const crc = crc32(data);
        const lh = localHeader(entry, crc, nameBytes);
        ctrl.enqueue(lh);
        ctrl.enqueue(nameBytes);
        ctrl.enqueue(data);
        central.push(centralHeader(entry, crc, nameBytes, offset));
        offset += lh.length + nameBytes.length + data.length;
        count++;
        return;
      }

      // 中央目录 + 结尾记录
      const cdStart = offset;
      let cdSize = 0;
      for (const c of central) {
        ctrl.enqueue(c);
        cdSize += c.length;
      }
      const eocd = new DataView(new ArrayBuffer(22));
      eocd.setUint32(0, 0x06054b50, true);
      eocd.setUint16(8, count, true);
      eocd.setUint16(10, count, true);
      eocd.setUint32(12, cdSize, true);
      eocd.setUint32(16, cdStart, true);
      ctrl.enqueue(new Uint8Array(eocd.buffer));
      ctrl.close();
    },
  });
}
