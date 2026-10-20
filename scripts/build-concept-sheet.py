"""
컨셉 시트(docs/concept/concept-sheet.html) 빌드: 템플릿에 캐릭터 이미지와 예시 레터를 넣어 단독 HTML 로 만든다.
  npx tsx scripts/render-sample.ts /tmp/fragment.html --fragment
  python3 scripts/build-concept-sheet.py /tmp/fragment.html
"""
import base64, io, re, sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
fragment = Path(sys.argv[1]).read_text()
imgs = {}
for png in (root / "public/character").glob("*.png"):
    im = Image.open(png)
    im.thumbnail((400, 220), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    imgs[png.stem] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

page = (root / "docs/concept/concept-sheet.template.html").read_text()
fragment = re.sub(r'src="/character/([a-z]+)\.png"', lambda m: f'src="{imgs[m.group(1)]}"', fragment)
for name, uri in imgs.items():
    page = page.replace("{{" + name + "}}", uri)
page = page.replace("{{LETTER}}", fragment)
assert "{{" not in page, "치환되지 않은 자리표시자가 있습니다"
(root / "docs/concept/concept-sheet.html").write_text(page)
print("docs/concept/concept-sheet.html", len(page) // 1024, "KB")
