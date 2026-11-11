# /// script
# requires-python = ">=3.10"
# ///
"""Check a .pptx against tokens.json. Exit 1 when a slide uses a value outside the tokens.

usage: uv run lint_tokens.py <deck.pptx> [--tokens tokens.json] [--warn]
Only slides are checked. The master and the layouts belong to the template.
"""
import json, re, sys, zipfile
from collections import defaultdict
from pathlib import Path

E = 12700
args = [a for a in sys.argv[1:] if not a.startswith("--")]
tok_path = Path(sys.argv[sys.argv.index("--tokens") + 1]) if "--tokens" in sys.argv else Path(__file__).with_name("tokens.json")
if "--tokens" in sys.argv:
    args.remove(str(tok_path))
show_warn = "--warn" in sys.argv
T = json.loads(tok_path.read_text(encoding="utf8"))
PALETTE = set(T["color"].values())
SIZES = {p * 100 for p in T["font_pt"] + T["font_pt_exempt"]}
SPACE = {p * 100 for p in T["para_space_pt"]}
STEP = T["inset_step_pt"] * E
F = T["frame_pt"]

BLOCK = re.compile(r"<p:(sp|pic|cxnSp)>.*?</p:\1>", re.S)
XFRM = re.compile(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>')


def check(xml):
    err, warn = defaultdict(int), defaultdict(int)
    for c in re.findall(r'<a:srgbClr val="([0-9A-Fa-f]{6})"', xml):
        if c.upper() not in PALETTE:
            err[f"color {c.upper()}"] += 1
    for w in re.findall(r'<a:ln[LRTB]? w="(\d+)"', xml):
        if int(w) not in T["line_emu"]:
            err[f"line width {int(w) / E:g} pt"] += 1
    for s in re.findall(r'<a:(?:rPr|defRPr|endParaRPr)\b[^>]*? sz="(\d+)"', xml):
        if int(s) not in SIZES:
            err[f"font size {int(s) / 100:g} pt"] += 1
    for v in re.findall(r'<a:lnSpc><a:spcPct val="(\d+)"', xml):
        if int(v) != T["line_spacing_pct"] * 1000:
            err[f"line spacing {int(v) / 1000:g}%"] += 1
    for v in re.findall(r'<a:spc(?:Bef|Aft)><a:spcPts val="(\d+)"', xml):
        if int(v) not in SPACE:
            err[f"paragraph space {int(v) / 100:g} pt"] += 1
    for f in re.findall(r'<a:(?:latin|ea) typeface="([^"+][^"]*)"', xml):
        if f not in T["fonts"]:
            err[f"font {f}"] += 1
    if "<a:outerShdw" in xml or "<a:innerShdw" in xml:
        err["shadow"] += len(re.findall(r"<a:(?:outer|inner)Shdw", xml))
    for a in re.findall(r'prst="(\w*Arrow\w*)"', xml):
        err[f"block arrow {a}"] += 1
    for a in re.findall(r"<a:(?:head|tail)End ([^>]*)/>", xml):
        if 'type="triangle"' in a and ('w="lg"' not in a or 'len="lg"' not in a):
            err["arrow head not lg"] += 1
    for v in re.findall(r'\b[ltrb]Ins="(\d+)"', xml):
        if int(v) % STEP:
            warn[f"inset {int(v) / E:g} pt"] += 1
    for m in BLOCK.finditer(xml):
        s = m.group(0)
        if "<p:ph" in s:
            continue
        g = XFRM.search(s)
        if not g:
            continue
        x, y, w, h = (int(v) / E for v in g.groups())
        name = re.search(r'name="([^"]*)"', s).group(1)
        if x < F["x0"] - 0.5 or y < F["y0"] - 0.5 or x + w > F["x1"] + 0.5 or y + h > F["y1"] + 0.5:
            err[f"outside frame: {name}"] += 1
        k = re.search(r'prst="roundRect">\s*(?:<a:avLst/>|<a:avLst>\s*<a:gd name="adj" fmla="val (\d+)")', s)
        if k and min(w, h) > 0:
            adj = int(k.group(1)) if k.group(1) else 16667
            r = adj / 100000 * min(w, h)
            if adj < 45000 and abs(r - T["radius_pt"]) > 0.5:
                err[f"radius {r:.1f} pt"] += 1
        if m.group(1) == "sp" and 'prst="ellipse"' in s and "<a:t>" in s and abs(w - h) < 0.5 and abs(w - T["badge_pt"]) > 0.5:
            warn[f"badge {w:g} pt"] += 1
        if m.group(1) == "pic" and abs(w - h) < 0.5 and w <= 72 and round(w) not in T["icon_pt"]:
            warn[f"icon {w:g} pt"] += 1
    return err, warn


z = zipfile.ZipFile(args[0])
names = sorted((n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)), key=lambda n: int(re.findall(r"\d+", n)[-1]))
total = 0
for n in names:
    err, warn = check(z.read(n).decode("utf8"))
    total += sum(err.values())
    num = re.findall(r"\d+", n)[-1]
    for k, v in err.items():
        print(f"slide {num}: ERROR {k} x{v}")
    if show_warn:
        for k, v in warn.items():
            print(f"slide {num}: warn  {k} x{v}")
print(f"{total} errors in {len(names)} slides")
sys.exit(1 if total else 0)
