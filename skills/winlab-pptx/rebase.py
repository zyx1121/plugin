# /// script
# requires-python = ">=3.10"
# ///
"""Move the slides of a deck onto the clean template master. Writes a new file.

usage: uv run rebase.py <deck.pptx> <out.pptx> [--template template.pptx] [--map 1=1,2=2,...]
The deck keeps its slides, notes and media. Its master, layouts and theme are replaced by the template's.
Empty body placeholders are removed from the slides, so no prompt text or layout frame shows.
"""
import posixpath, re, sys, zipfile
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith("--")]
def opt(name, default=None):
    if name in sys.argv:
        v = sys.argv[sys.argv.index(name) + 1]; args.remove(v); return v
    return default
tpl_path = opt("--template", str(Path(__file__).with_name("template.pptx")))
lmap = opt("--map")
deck_path, out_path = args
D, Tz = zipfile.ZipFile(deck_path), zipfile.ZipFile(tpl_path)

def rels(z, part):
    p = posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")
    if p not in z.namelist():
        return p, {}
    out = {}
    for r in re.findall(r"<Relationship [^>]*>", z.read(p).decode("utf8")):
        if 'TargetMode="External"' in r:
            continue
        t = re.search(r'Target="([^"]*)"', r).group(1)
        out[re.search(r'Id="([^"]*)"', r).group(1)] = posixpath.normpath(posixpath.join(posixpath.dirname(part), t))
    return p, out

def layout_name(z, part):
    return re.search(r'<p:cSld name="([^"]*)"', z.read(part).decode("utf8")).group(1)

num = lambda p: int(re.findall(r"\d+", p)[-1])
d_layouts = sorted((n for n in D.namelist() if re.fullmatch(r"ppt/slideLayouts/slideLayout\d+\.xml", n)), key=num)
t_layouts = sorted((n for n in Tz.namelist() if re.fullmatch(r"ppt/slideLayouts/slideLayout\d+\.xml", n)), key=num)
t_names = {layout_name(Tz, p).replace("&amp;", "&"): p for p in t_layouts}

def pick(name):
    """Map a deck layout to a template layout by what it is for."""
    n = name.lower()
    if "section" in n: return t_names["Section"]
    if "two" in n or "comparison" in n: return t_names["Two Columns"]
    if n.endswith("title") or "qa" in n or "thank" in n: return t_names["Title"]
    return t_names["Title & Bullets"]

mapping = {p: pick(layout_name(D, p)) for p in d_layouts}
if lmap:
    for pair in lmap.split(","):
        a, b = pair.split("=")
        mapping[f"ppt/slideLayouts/slideLayout{a}.xml"] = f"ppt/slideLayouts/slideLayout{b}.xml"

# Parts that belong to the deck's master side, and media only they use.
d_master = next(n for n in D.namelist() if re.fullmatch(r"ppt/slideMasters/slideMaster\d+\.xml", n))
t_master = next(n for n in Tz.namelist() if re.fullmatch(r"ppt/slideMasters/slideMaster\d+\.xml", n))
d_theme = next(t for t in rels(D, d_master)[1].values() if "/theme/" in t)
t_theme = next(t for t in rels(Tz, t_master)[1].values() if "/theme/" in t)
master_side = [d_master] + d_layouts
drop = set(master_side) | {rels(D, p)[0] for p in master_side} | {d_theme}
slide_side_media = set()
for n in D.namelist():
    if n.endswith(".rels") and not any(n == rels(D, p)[0] for p in master_side):
        part = posixpath.join(posixpath.dirname(posixpath.dirname(n)), posixpath.basename(n)[:-5])
        slide_side_media |= {t for t in rels(D, part)[1].values() if "/media/" in t}
for p in master_side:
    drop |= {t for t in rels(D, p)[1].values() if "/media/" in t and t not in slide_side_media}

# Template parts to bring in. Media get a prefix so names never collide.
bring = {}
t_side = [t_master] + t_layouts
for p in t_side:
    rp, rr = rels(Tz, p)
    text = Tz.read(rp).decode("utf8")
    for target in rr.values():
        if "/media/" in target:
            new = posixpath.join("ppt/media", "tpl-" + posixpath.basename(target))
            bring[new] = Tz.read(target)
            text = text.replace("../media/" + posixpath.basename(target) + '"', "../media/tpl-" + posixpath.basename(target) + '"')
    dest = p.replace(t_master, d_master)
    if p == t_master and t_theme != d_theme:
        text = text.replace("../theme/" + posixpath.basename(t_theme), "../theme/" + posixpath.basename(d_theme))
    bring[dest] = Tz.read(p)
    bring[posixpath.join(posixpath.dirname(dest), "_rels", posixpath.basename(dest) + ".rels")] = text.encode("utf8")
bring[d_theme] = Tz.read(t_theme)

PH_BODY = re.compile(r"<p:sp>(?:(?!</p:sp>).)*?<p:ph(?: idx=\"\d+\"| type=\"body\"| sz=\"\w+\")+/>(?:(?!</p:sp>).)*?</p:sp>", re.S)

def fix_slide(x, layout):
    lx = Tz.read(layout).decode("utf8") + Tz.read(t_master).decode("utf8")
    num_ph = re.search(r'<p:ph type="sldNum"[^>]*/>', lx)
    if num_ph:
        x = re.sub(r'<p:ph type="sldNum"[^>]*/>', num_ph.group(0), x)
    body = re.search(r'<p:ph type="body"[^>]*idx="1"[^>]*/>', Tz.read(layout).decode("utf8"))
    if body:
        x = re.sub(r'<p:ph type="subTitle" idx="1"/>', body.group(0), x)
    # drop body placeholders that carry no text and no picture
    return PH_BODY.sub(lambda m: "" if "<a:t>" not in m.group(0) and "<p:spPr/>" in m.group(0) else m.group(0), x)

with zipfile.ZipFile(out_path, "w") as out:
    for item in D.infolist():
        n = item.filename
        if n in drop:
            continue
        data = D.read(n)
        if n == "[Content_Types].xml":
            text = data.decode("utf8")
            for p in d_layouts:
                text = re.sub(r'<Override PartName="/%s"[^>]*/>' % re.escape(p), "", text)
            ct = "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"
            add = "".join(f'<Override PartName="/{p}" ContentType="{ct}"/>' for p in t_layouts)
            if 'Extension="png"' not in text:
                add += '<Default Extension="png" ContentType="image/png"/>'
            text = text.replace("</Types>", add + "</Types>")
            data = text.encode("utf8")
        elif re.fullmatch(r"ppt/slides/_rels/slide\d+\.xml\.rels", n):
            text = data.decode("utf8")
            cur = re.search(r"\.\./slideLayouts/(slideLayout\d+\.xml)", text).group(1)
            new = posixpath.basename(mapping["ppt/slideLayouts/" + cur])
            data = text.replace("../slideLayouts/" + cur, "../slideLayouts/" + new).encode("utf8")
        elif re.fullmatch(r"ppt/slides/slide\d+\.xml", n):
            cur = next(t for t in rels(D, n)[1].values() if "/slideLayouts/" in t)
            data = fix_slide(data.decode("utf8"), mapping[cur]).encode("utf8")
        out.writestr(n, data, compress_type=item.compress_type)
    for n, data in bring.items():
        out.writestr(n, data, compress_type=zipfile.ZIP_DEFLATED)
print({posixpath.basename(a): posixpath.basename(b) for a, b in mapping.items()})
