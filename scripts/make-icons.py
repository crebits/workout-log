"""단색 배경 + 덤벨 모양 아이콘 PNG 생성 (외부 라이브러리 없이)"""
import struct, sys, zlib, os

BG = (47, 111, 237)   # --accent
FG = (255, 255, 255)

def dumbbell(x, y, s):
    u = s / 32  # 32x32 격자 기준
    gx, gy = x / u, y / u
    if 9 <= gx < 23 and 14.5 <= gy < 17.5: return True        # 손잡이
    if 6 <= gx < 9 and 9 <= gy < 23: return True               # 안쪽 원판
    if 23 <= gx < 26 and 9 <= gy < 23: return True
    if 3.5 <= gx < 6 and 11.5 <= gy < 20.5: return True        # 바깥 원판
    if 26 <= gx < 28.5 and 11.5 <= gy < 20.5: return True
    return False

def png(size, path):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            row += bytes(FG if dumbbell(x + .5, y + .5, size) else BG)
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)

out = sys.argv[1]
for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon-180.png')]:
    png(size, os.path.join(out, name))
