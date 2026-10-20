# 캐릭터 시트에서 포즈별 투명 PNG 를 잘라 낸다: python3 scripts/crop-character.py assets/reponyang-sheet.png public/character
import sys
from collections import deque
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
S = im.width / 2000
boxes = {
  "wave":      (100, 140, 735, 940),
  "walk":      (730, 85, 1080, 585),
  "run":       (1095, 85, 1455, 585),
  "stand":     (1570, 90, 1905, 585),
  "letter":    (760, 600, 1115, 1065),
  "sit":       (1160, 630, 1515, 1085),
  "peek":      (1570, 610, 1860, 1065),
}
for name, b in boxes.items():
    c = im.crop(tuple(int(v * S) for v in b))
    a = np.asarray(c).astype(np.int16)
    h, w, _ = a.shape
    # 배경: 테두리에서 연결된 밝은 무채색 픽셀
    light = (a.min(axis=2) > 232) & ((a.max(axis=2) - a.min(axis=2)) < 18)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if light[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if light[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    rgba = np.dstack([np.asarray(c), alpha])
    img = Image.fromarray(rgba, "RGBA")
    img = img.crop(img.getbbox())
    # 이메일용 2x 해상도: 긴 변 360px
    img.thumbnail((360, 360), Image.LANCZOS)
    img.save(f"{out}/{name}.png", optimize=True)
    print(name, img.size)
