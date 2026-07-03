# /// script
# requires-python = ">=3.10"
# dependencies = ["python-pptx==1.0.2"]
# ///
"""Extract real colors/fonts from kilo-sense-talk: theme, master txStyles, p8 diagram box."""
import sys
import zipfile
from lxml import etree

A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"


def q(ns, tag):
    return f"{{{ns}}}{tag}"


def color_of(parent):
    """first solidFill color under parent, resolved as srgb or scheme:name+mods."""
    if parent is None:
        return None
    sf = parent.find(q(A, "solidFill"))
    if sf is None:
        return None
    srgb = sf.find(q(A, "srgbClr"))
    if srgb is not None:
        mods = "".join(f" {etree.QName(c).localname}={c.get('val')}" for c in srgb)
        return f"#{srgb.get('val')}{mods}"
    sch = sf.find(q(A, "schemeClr"))
    if sch is not None:
        mods = "".join(f" {etree.QName(c).localname}={c.get('val')}" for c in sch)
        return f"scheme:{sch.get('val')}{mods}"
    return "?"


def latin_of(parent):
    if parent is None:
        return None
    lat = parent.find(q(A, "latin"))
    return lat.get("typeface") if lat is not None else None


z = zipfile.ZipFile(sys.argv[1])

print("=== theme1 clrScheme ===")
theme = etree.fromstring(z.read("ppt/theme/theme1.xml"))
clr = theme.find(f".//{q(A,'clrScheme')}")
clrmap_rgb = {}
for child in clr:
    tag = etree.QName(child).localname
    srgb = child.find(q(A, "srgbClr"))
    sysc = child.find(q(A, "sysClr"))
    val = srgb.get("val") if srgb is not None else (sysc.get("lastClr") if sysc is not None else "?")
    clrmap_rgb[tag] = val
    print(f"  {tag:9} #{val}")
fs = theme.find(f".//{q(A,'fontScheme')}")
print("=== theme1 fontScheme ===")
for mf in ("majorFont", "minorFont"):
    m = fs.find(q(A, mf))
    print(f"  {mf}: latin={latin_of(m)!r} ea={(m.find(q(A,'ea')).get('typeface'))!r}")

print("\n=== slideMaster clrMap (scheme-name -> theme-slot) ===")
master = etree.fromstring(z.read("ppt/slideMasters/slideMaster1.xml"))
cm = master.find(q(P, "clrMap"))
print(" ", dict(cm.attrib))

print("\n=== master txStyles (title / body) defRPr ===")
tx = master.find(q(P, "txStyles"))
for sname in ("titleStyle", "bodyStyle"):
    st = tx.find(q(P, sname))
    if st is None:
        continue
    print(f"  {sname}:")
    for lvl in st:
        ln = etree.QName(lvl).localname
        if not ln.endswith("pPr"):
            continue
        defrpr = lvl.find(q(A, "defRPr"))
        if defrpr is None:
            continue
        sz = defrpr.get("sz")
        print(f"    {ln:8} sz={sz} color={color_of(defrpr)} latin={latin_of(defrpr)}")

print("\n=== p8 diagram boxes: raw txBody of first 3 real autoshapes ===")
slide8 = etree.fromstring(z.read("ppt/slides/slide8.xml"))
count = 0
for sp in slide8.iter(q(P, "sp")):
    txb = sp.find(q(P, "txBody"))
    geom = sp.find(f".//{q(A,'prstGeom')}")
    nv = sp.find(f".//{q(P,'cNvPr')}")
    if txb is None or geom is None:
        continue
    txt = "".join(t.text or "" for t in txb.iter(q(A, "t")))
    if not txt.strip():
        continue
    count += 1
    if count > 3:
        break
    print(f"\n  --- box id={nv.get('id')} text={txt!r} prst={geom.get('prst')} ---")
    # spPr solidFill (box fill) + ln color
    spPr = sp.find(q(P, "spPr"))
    print(f"    box fill={color_of(spPr)}  ", end="")
    ln = spPr.find(q(A, "ln")) if spPr is not None else None
    print(f"line={color_of(ln)}")
    # text: lstStyle defRPr + each run rPr
    lst = txb.find(q(A, "lstStyle"))
    if lst is not None and len(lst):
        for lvl in lst:
            dr = lvl.find(q(A, "defRPr"))
            if dr is not None:
                print(f"    lstStyle {etree.QName(lvl).localname}: sz={dr.get('sz')} color={color_of(dr)} latin={latin_of(dr)}")
    for p in txb.iter(q(A, "p")):
        ppr = p.find(q(A, "pPr"))
        for r in p.iter(q(A, "r")):
            rpr = r.find(q(A, "rPr"))
            t = r.find(q(A, "t"))
            sz = rpr.get("sz") if rpr is not None else None
            print(f"    run {(t.text if t is not None else '')!r}: sz={sz} color={color_of(rpr)} latin={latin_of(rpr)} (pPr defRPr color={color_of(ppr.find(q(A,'defRPr')) if ppr is not None else None)})")
