# /// script
# requires-python = ">=3.10"
# ///
"""Rewrite a .pptx so every slide uses the values in tokens.json. Writes a new file.

usage: uv run restyle.py <in.pptx> <out.pptx> [--tokens tokens.json]
Changes style only: colors, line widths, corner radius, font sizes, spacing, shadows, arrows, fonts.
It does not move shapes. Run lint_tokens.py on the result; fix layout findings by hand or in the generator.
"""
import json, re, sys, zipfile
from pathlib import Path

E = 12700
args = [a for a in sys.argv[1:] if not a.startswith("--")]
tok_path = Path(sys.argv[sys.argv.index("--tokens") + 1]) if "--tokens" in sys.argv else Path(__file__).with_name("tokens.json")
if "--tokens" in sys.argv:
    args.remove(str(tok_path))
src, dst = args
T = json.loads(tok_path.read_text(encoding="utf8"))
C, R = T["color"], T["remap"]
SHAPE = {old: C[name] for name, olds in R["color"].items() for old in olds}
# Blue text is always the token named by text_blue, so accent stays for lines, icons and fills.
TEXT = dict(SHAPE)
TEXT.update({old: C[T["text_blue"]] for old in R["color"]["accent"] + [C["accent"]]})
TEXT.update({old: C["sub"] for old in R["color"]["neutral_line"] + [C["neutral_line"]]})
SZ = {str(int(k) * 100): str(v * 100) for k, v in R["font_pt"].items()}
INS = {int(k): v for k, v in R["inset_emu"].items()}
SPC = {int(k) * 100: v * 100 for k, v in R["para_space_pt"].items()}
THIN, NORMAL = T["line_emu"]
SP = re.compile(r"<p:sp>(?:(?!</p:sp>).)*</p:sp>", re.S)


def recolor(s, table):
    return re.sub(r'(<a:srgbClr val=")([0-9A-Fa-f]{6})"', lambda m: m.group(1) + table.get(m.group(2).upper(), m.group(2).upper()) + '"', s)


def arrow(m):
    """Block arrow shape -> straight line with a triangle head, on the arrow's center line."""
    s = m.group(0)
    k = re.search(r'prst="(rightArrow|downArrow)"', s)
    xf = re.search(r'<a:xfrm([^>]*)><a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', s)
    col = re.search(r'srgbClr val="(\w{6})"', s)
    if not (k and xf and col):
        return s
    nv = re.search(r'<p:cNvPr id="(\d+)" name="([^"]*)"', s)
    at, x, y, w, h = xf.group(1), *map(int, xf.groups()[1:])
    if k.group(1) == "rightArrow":
        y, h = y + h // 2, 0
    else:
        x, w = x + w // 2, 0
    return (
        f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{nv.group(1)}" name="{nv.group(2)}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>'
        f'<p:spPr><a:xfrm{at}><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom>'
        f'<a:ln w="{NORMAL}"><a:solidFill><a:srgbClr val="{col.group(1)}"/></a:solidFill><a:tailEnd type="triangle"/></a:ln></p:spPr></p:cxnSp>'
    )


def radius(m):
    """PowerPoint stores the corner as a share of the short side. Convert a fixed pt radius per shape."""
    s = m.group(0)
    k = re.search(r'prst="(roundRect|round2SameRect)"', s)
    e = re.search(r'<p:spPr>.*?<a:ext cx="(\d+)" cy="(\d+)"', s, re.S)
    if not (k and e):
        return s
    short = min(int(e.group(1)), int(e.group(2)))
    old = re.search(r'prst="roundRect">\s*<a:avLst>\s*<a:gd name="adj" fmla="val (\d+)"', s)
    if not short or (old and int(old.group(1)) >= 45000):  # a pill stays a pill
        return s
    adj = min(50000, round(T["radius_pt"] * E / short * 100000))
    gd = f'<a:gd name="adj" fmla="val {adj}"/>' if k.group(1) == "roundRect" else f'<a:gd name="adj1" fmla="val {adj}"/><a:gd name="adj2" fmla="val 0"/>'
    return re.sub(r'(<a:prstGeom prst="round\w+">)\s*(?:<a:avLst/>|<a:avLst>.*?</a:avLst>)', rf"\1<a:avLst>{gd}</a:avLst>", s, count=1, flags=re.S)


def slide(x):
    x = SP.sub(arrow, x)
    x = SP.sub(radius, x)
    x = re.sub(r"<a:(rPr|defRPr|endParaRPr)\b[^>]*?(?<!/)>.*?</a:\1>", lambda m: recolor(m.group(0), TEXT), x, flags=re.S)
    x = recolor(x, SHAPE)
    x = re.sub(r'(<a:ln[LRTB] w=")\d+"', rf'\g<1>{THIN}"', x)
    x = re.sub(r'(<a:ln w=")(\d+)"', lambda m: f'{m.group(1)}{THIN if int(m.group(2)) <= THIN else NORMAL}"', x)
    size = T["arrow"]["size"]
    x = re.sub(r'<a:(head|tail)End type="triangle"[^>]*/>', rf'<a:\1End type="triangle" w="{size}" len="{size}"/>', x)
    x = re.sub(r'(<a:(?:rPr|defRPr|endParaRPr)\b[^>]*? sz=")(\d+)"', lambda m: m.group(1) + SZ.get(m.group(2), m.group(2)) + '"', x)
    x = re.sub(r'(<a:lnSpc><a:spcPct val=")\d+"', rf'\g<1>{T["line_spacing_pct"] * 1000}"', x)
    x = re.sub(r'(<a:spc(?:Bef|Aft)><a:spcPts val=")(\d+)"', lambda m: f'{m.group(1)}{SPC.get(int(m.group(2)), int(m.group(2)))}"', x)
    x = re.sub(r'\b([ltrb]Ins=")(\d+)"', lambda m: f'{m.group(1)}{INS.get(int(m.group(2)), int(m.group(2)))}"', x)
    x = re.sub(r"<a:effectLst>.*?</a:effectLst>", "<a:effectLst/>", x, flags=re.S)
    latin, ea = T["fonts"]
    x = re.sub(r'(<a:latin typeface=")(?![+"])(?!%s")[^"]*"' % re.escape(latin), rf'\g<1>{latin}"', x)
    x = re.sub(r'(<a:ea typeface=")(?![+"])(?!%s")[^"]*"' % re.escape(ea), rf'\g<1>{ea}"', x)
    return x


zin = zipfile.ZipFile(src)
with zipfile.ZipFile(dst, "w") as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if re.fullmatch(r"ppt/slides/slide\d+\.xml", item.filename):
            data = slide(data.decode("utf8")).encode("utf8")
        elif item.filename.endswith(".svg"):
            text = data.decode("utf8")
            for old, new in R["svg"].items():
                text = re.sub("#" + old, "#" + new, text, flags=re.I)
            data = text.encode("utf8")
        zout.writestr(item, data, compress_type=item.compress_type)
