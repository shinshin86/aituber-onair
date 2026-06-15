from __future__ import annotations

import struct
import zlib
from dataclasses import dataclass
from pathlib import Path

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


@dataclass
class PngImage:
    width: int
    height: int
    rgba: bytes


def _read_chunks(data: bytes):
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError("not a PNG file")

    pos = len(PNG_SIGNATURE)
    while pos < len(data):
        if pos + 8 > len(data):
            raise ValueError("truncated PNG chunk")
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        chunk_type = data[pos + 4 : pos + 8]
        start = pos + 8
        end = start + length
        if end + 4 > len(data):
            raise ValueError("truncated PNG chunk data")
        yield chunk_type, data[start:end]
        pos = end + 4


def _paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def load_png_rgba(path: str | Path) -> PngImage:
    chunks = list(_read_chunks(Path(path).read_bytes()))
    ihdr = next((chunk for typ, chunk in chunks if typ == b"IHDR"), None)
    if ihdr is None:
        raise ValueError("missing IHDR")

    width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
        ">IIBBBBB", ihdr
    )
    if bit_depth != 8 or compression != 0 or filter_method != 0 or interlace != 0:
        raise ValueError("only 8-bit non-interlaced PNG images are supported")
    if color_type not in (2, 6):
        raise ValueError("only RGB and RGBA PNG images are supported")

    channels = 4 if color_type == 6 else 3
    row_bytes = width * channels
    raw = zlib.decompress(b"".join(chunk for typ, chunk in chunks if typ == b"IDAT"))
    expected = height * (row_bytes + 1)
    if len(raw) != expected:
        raise ValueError(f"unexpected PNG payload size: got {len(raw)}, expected {expected}")

    rows: list[bytearray] = []
    pos = 0
    for _y in range(height):
        filter_type = raw[pos]
        pos += 1
        row = bytearray(raw[pos : pos + row_bytes])
        pos += row_bytes
        prev = rows[-1] if rows else bytearray(row_bytes)

        for i in range(row_bytes):
            left = row[i - channels] if i >= channels else 0
            up = prev[i]
            upper_left = prev[i - channels] if i >= channels else 0
            if filter_type == 1:
                row[i] = (row[i] + left) & 0xFF
            elif filter_type == 2:
                row[i] = (row[i] + up) & 0xFF
            elif filter_type == 3:
                row[i] = (row[i] + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                row[i] = (row[i] + _paeth(left, up, upper_left)) & 0xFF
            elif filter_type != 0:
                raise ValueError(f"unsupported PNG filter type: {filter_type}")
        rows.append(row)

    if channels == 4:
        rgba = b"".join(rows)
    else:
        out = bytearray(width * height * 4)
        dst = 0
        for row in rows:
            for src in range(0, len(row), 3):
                out[dst : dst + 3] = row[src : src + 3]
                out[dst + 3] = 255
                dst += 4
        rgba = bytes(out)

    return PngImage(width=width, height=height, rgba=rgba)


def _chunk(chunk_type: bytes, payload: bytes) -> bytes:
    crc = zlib.crc32(chunk_type)
    crc = zlib.crc32(payload, crc) & 0xFFFFFFFF
    return struct.pack(">I", len(payload)) + chunk_type + payload + struct.pack(">I", crc)


def save_png_rgba(path: str | Path, image: PngImage) -> None:
    if len(image.rgba) != image.width * image.height * 4:
        raise ValueError("RGBA payload size does not match dimensions")

    raw = bytearray()
    stride = image.width * 4
    for y in range(image.height):
        raw.append(0)
        start = y * stride
        raw.extend(image.rgba[start : start + stride])

    ihdr = struct.pack(">IIBBBBB", image.width, image.height, 8, 6, 0, 0, 0)
    payload = (
        PNG_SIGNATURE
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _chunk(b"IEND", b"")
    )
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(payload)


def crop_rgba(image: PngImage, left: int, top: int, width: int, height: int) -> PngImage:
    if left < 0 or top < 0 or left + width > image.width or top + height > image.height:
        raise ValueError("crop rectangle is outside the image")
    out = bytearray(width * height * 4)
    src_stride = image.width * 4
    dst_stride = width * 4
    for y in range(height):
        src = ((top + y) * image.width + left) * 4
        dst = y * dst_stride
        out[dst : dst + dst_stride] = image.rgba[src : src + dst_stride]
    return PngImage(width=width, height=height, rgba=bytes(out))


def alpha_bbox(image: PngImage, threshold: int = 16) -> tuple[int, int, int, int] | None:
    min_x = image.width
    min_y = image.height
    max_x = -1
    max_y = -1
    for y in range(image.height):
        row = y * image.width * 4
        for x in range(image.width):
            if image.rgba[row + x * 4 + 3] > threshold:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x < 0:
        return None
    return min_x, min_y, max_x, max_y
