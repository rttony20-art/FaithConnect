#!/usr/bin/env python3
"""Generates the avatar part images in public/avatar-parts/.

Every file is a single-shape SVG (200x200). The app paints each one with a colour
(skin, hair, eyes, clothes ...) using CSS masks, so one file serves every colour.
Run from the repo root:  python3 scripts/make-avatar-parts.py
The counts here must match src/avatar/parts.js (scripts/check-avatar-parts.mjs verifies it).
"""
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "avatar-parts")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".svg"):
        os.remove(os.path.join(OUT, f))


def write(name, body, defs=""):
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">'
           + (f"<defs>{defs}</defs>" if defs else "") + body + "</svg>")
    with open(os.path.join(OUT, name + ".svg"), "w") as fh:
        fh.write(svg)


def stroke(d, w=4):
    return f'<path d="{d}" fill="none" stroke="#000" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'


def fill(d, extra=""):
    return f'<path d="{d}" fill="#000" {extra}/>'


def mirror(d_left):
    """Mirror a path written with only M/L/Q/C/Z and absolute coordinates around x=100."""
    import re
    out, toks = [], re.findall(r"[A-Za-z]|-?\d*\.?\d+", d_left)
    i = 0
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            out.append(t)
            i += 1
        else:
            out.append(f"{200 - float(toks[i]):g}")
            out.append(toks[i + 1])
            i += 2
    return " ".join(out)


def both(d_left, make):
    return make(d_left) + make(mirror(d_left))


# ---------------------------------------------------------------- face + neck (skin)
NECK = '<rect x="84" y="124" width="32" height="54"/>'
faces = [
    '<ellipse cx="100" cy="92" rx="46" ry="58"/>',                                   # oval
    '<ellipse cx="100" cy="94" rx="50" ry="54"/>',                                   # round
    '<path d="M52 72 Q52 36 100 36 Q148 36 148 72 L148 118 Q148 150 116 150 L84 150 Q52 150 52 118 Z"/>',  # square
    '<path d="M54 74 Q54 32 100 32 Q146 32 146 74 Q146 112 124 140 Q112 154 100 154 Q88 154 76 140 Q54 112 54 74 Z"/>',  # heart
]
for i, f in enumerate(faces):
    write(f"face-{i}", f + NECK)

# neck shadow under the chin (darker skin)
write("shade", '<path d="M84 148 Q100 166 116 148 L116 172 L84 172 Z"/>')

# ---------------------------------------------------------------- ears (skin, behind face)
for i, (rx, ry) in enumerate([(6, 10), (8, 12), (10, 15)]):
    write(f"ears-{i}", f'<ellipse cx="52" cy="98" rx="{rx}" ry="{ry}"/><ellipse cx="148" cy="98" rx="{rx}" ry="{ry}"/>')

# ---------------------------------------------------------------- nose (darker skin)
noses = [
    stroke("M93 108 Q100 115 107 108", 3),
    stroke("M100 94 Q97 105 94 109 Q100 114 106 109", 3),
    stroke("M90 108 Q100 118 110 108", 3.4),
    '<circle cx="95" cy="109" r="2.4" fill="#000"/><circle cx="105" cy="109" r="2.4" fill="#000"/>' + stroke("M100 96 L100 106", 2.4),
    stroke("M100 88 L100 110", 2.6) + stroke("M93 112 Q100 117 107 112", 3),
]
for i, n in enumerate(noses):
    write(f"nose-{i}", n)

# ---------------------------------------------------------------- mouth (lip colour)
mouths = [
    stroke("M82 126 Q100 142 118 126", 4.4),                                           # smile
    stroke("M86 131 L114 131", 4.4),                                                   # neutral
    fill("M80 124 Q100 150 120 124 Q100 130 80 124 Z"),                                # open smile
    stroke("M90 128 Q100 136 110 128", 4.2),                                           # small smile
    stroke("M86 131 Q100 135 116 124", 4.2),                                           # smirk
    fill("M84 129 Q92 120 100 124 Q108 120 116 129 Q108 139 100 139 Q92 139 84 129 Z"),  # full lips
]
for i, m in enumerate(mouths):
    write(f"mouth-{i}", m)

# ---------------------------------------------------------------- eyes (whites / iris / pupil+outline)
EYE_X = (78, 122)
# (kind, rx, ry, iris r, pupil r)
eyes = [
    ("ell", 8.5, 8.5, 5.2, 2.4),     # round
    ("lens", 11, 8, 5.0, 2.3),       # almond
    ("ell", 11, 7.5, 5.4, 2.5),      # wide
    ("lens", 11, 5.6, 3.8, 1.8),     # narrow
    ("sleepy", 10.5, 8, 5.2, 2.4),   # sleepy
    ("ell", 9.5, 10, 6.2, 2.9),      # big
]


def eye_path(kind, cx, cy, rx, ry):
    if kind == "ell":
        return f"M{cx - rx} {cy} A{rx} {ry} 0 1 0 {cx + rx} {cy} A{rx} {ry} 0 1 0 {cx - rx} {cy} Z"
    if kind == "lens":
        return f"M{cx - rx} {cy} Q{cx} {cy - ry * 2} {cx + rx} {cy} Q{cx} {cy + ry * 2} {cx - rx} {cy} Z"
    # sleepy: flat heavy upper lid, rounded lower
    return f"M{cx - rx} {cy - 1} L{cx + rx} {cy - 1} Q{cx} {cy + ry * 2 + 1} {cx - rx} {cy - 1} Z"


for i, (kind, rx, ry, ir, pr) in enumerate(eyes):
    whites, iris, pupil, clips = "", "", "", ""
    for k, cx in enumerate(EYE_X):
        cy = 90
        p = eye_path(kind, cx, cy, rx, ry)
        clips += f'<clipPath id="c{k}"><path d="{p}"/></clipPath>'
        whites += f'<path d="{p}" fill="#000"/>'
        look = 1.5 if k == 0 else -1.5  # eyes look slightly inward
        iy = cy + (2 if kind == "sleepy" else 0)
        iris += f'<g clip-path="url(#c{k})"><circle cx="{cx + look}" cy="{iy}" r="{ir}" fill="#000"/></g>'
        lid = 3.4 if kind == "sleepy" else 2.2
        pupil += (f'<g clip-path="url(#c{k})"><circle cx="{cx + look}" cy="{iy}" r="{pr}" fill="#000"/></g>'
                  f'<path d="{p}" fill="none" stroke="#000" stroke-width="{lid}" stroke-linejoin="round"/>')
    write(f"eyew-{i}", whites)
    write(f"eyei-{i}", iris, clips)
    write(f"eyep-{i}", pupil, clips)

# ---------------------------------------------------------------- eyebrows (hair colour)
brows = [
    (("M64 75 L92 72", 4.6)),
    (("M64 77 Q78 66 92 74", 4.4)),
    (("M64 75 L92 72", 7.5)),
    (("M64 79 L92 70", 3.4)),
    (("M64 75 Q78 71 92 76", 4.4)),
]
for i, (d, w) in enumerate(brows):
    write(f"brows-{i}", both(d, lambda dd: stroke(dd, w)))

# ---------------------------------------------------------------- hair (hair colour)
# Each style: (back_svg or None, front_svg or None)
cap = "M52 90 C46 40 70 22 100 22 C130 22 154 40 148 90 C146 72 138 58 124 54 C112 62 88 62 76 54 C62 58 54 72 52 90 Z"
hair = {
    0: (None, fill("M54 82 C50 44 72 28 100 28 C128 28 150 44 146 82 C140 64 124 54 100 54 C76 54 60 64 54 82 Z")),   # buzz
    1: (None, fill("M50 92 C42 40 68 20 102 20 C136 20 156 44 148 92 C146 74 140 62 128 57 C112 50 88 56 66 62 C58 68 54 80 50 92 Z")),  # short side part
    2: (fill('M100 6 C150 6 168 40 164 76 C170 100 156 124 140 128 L60 128 C44 124 30 100 36 76 C32 40 50 6 100 6 Z'),
        fill("M56 82 C54 54 76 42 100 42 C124 42 146 54 144 82 C136 66 120 58 100 58 C80 58 64 66 56 82 Z")),             # afro
    3: (None, '<g fill="#000"><circle cx="72" cy="46" r="19"/><circle cx="100" cy="36" r="21"/><circle cx="128" cy="46" r="19"/>'
              '<circle cx="56" cy="68" r="14"/><circle cx="144" cy="68" r="14"/><circle cx="84" cy="52" r="14"/><circle cx="116" cy="52" r="14"/></g>'),  # curly
    4: (fill("M46 82 C38 30 162 30 154 82 L160 176 L40 176 Z"),
        fill("M50 94 C44 40 70 22 100 22 C130 22 156 40 150 94 C146 74 130 56 100 44 C70 56 54 74 50 94 Z")),            # long straight
    5: (fill("M46 82 C34 40 166 40 154 82 C170 112 150 132 160 152 C164 166 150 178 138 174 L62 174 C50 178 36 166 40 152 C50 132 30 112 46 82 Z"),
        fill("M50 92 C42 40 68 20 102 20 C136 20 156 44 150 92 C148 74 140 62 128 57 C112 50 88 56 66 62 C58 68 54 80 50 92 Z")),  # long wavy
    6: (None, fill(cap) + '<circle cx="100" cy="14" r="17" fill="#000"/>'),                                               # bun
    7: ('<g fill="#000">' + "".join(f'<rect x="{x}" y="78" width="9" height="96" rx="4.5"/><rect x="{191 - x - 9 + 9}" y="78" width="9" height="96" rx="4.5"/>' for x in (36, 46, 56)) + "</g>",
        fill(cap)),                                                                                                       # braids
    8: (fill("M138 52 C170 60 176 120 160 162 C150 170 140 160 142 140 C146 110 144 80 138 52 Z"),
        fill("M54 84 C50 40 74 24 100 24 C126 24 150 40 146 84 C140 60 120 50 100 50 C80 50 60 60 54 84 Z")),            # ponytail
    9: (fill("M48 84 C42 28 158 28 152 84 L158 144 Q100 156 42 144 Z"),
        fill("M50 92 C44 40 70 22 100 22 C130 22 156 40 150 92 L146 72 Q100 62 54 72 Z")),                               # bob
    10: (None, fill("M86 44 C84 6 116 6 114 44 L112 70 L88 70 Z")),                                                       # mohawk
    11: (None, None),                                                                                                      # bald
    12: (None, '<path fill="#000" fill-rule="evenodd" d="M52 90 C46 40 70 22 100 22 C130 22 154 40 148 90 C146 72 138 58 124 54 C112 62 88 62 76 54 C62 58 54 72 52 90 Z '
               + " ".join(f"M{x} 26 h2.6 v34 h-2.6 Z" for x in (70, 80, 90, 100, 110, 120, 130)) + '"/>'),             # cornrows
    13: (None, fill("M48 96 C40 40 68 18 104 20 C140 22 158 46 150 90 C148 72 142 66 126 64 C108 72 80 64 62 74 C54 80 50 88 48 96 Z")),  # swept fringe
}
for i, (back, front) in hair.items():
    if back:
        write(f"hairb-{i}", back)
    if front:
        write(f"hairf-{i}", front)

# ---------------------------------------------------------------- facial hair (hair colour); 0 = none
beards = {
    1: fill("M58 98 Q60 138 100 150 Q140 138 142 98 Q132 124 100 128 Q68 124 58 98 Z", 'fill-opacity="0.38"'),          # stubble
    2: fill("M78 121 Q90 112 100 118 Q110 112 122 121 Q110 127 100 123 Q90 127 78 121 Z"),                              # moustache
    3: fill("M78 121 Q90 112 100 118 Q110 112 122 121 Q110 127 100 123 Q90 127 78 121 Z") + fill("M90 138 Q100 134 110 138 L107 154 Q100 158 93 154 Z"),  # goatee
    4: fill("M54 94 Q52 152 100 162 Q148 152 146 94 Q140 122 120 126 Q100 118 80 126 Q60 122 54 94 Z"),                 # full beard
}
for i, b in beards.items():
    write(f"beard-{i}", b)

# ---------------------------------------------------------------- clothes (clothes colour)
LEFT_TOP = "M10 200 C14 178 40 166 70 160 L84 156"
RIGHT_TOP = "L130 160 C160 166 186 178 190 200 Z"
necklines = [
    "L84 156 Q100 172 116 156",                       # crew tee
    "L84 156 L100 186 L116 156",                      # v-neck
    "L84 154 Q100 192 116 154",                       # scoop
    "L86 156 L100 180 L114 156",                      # polo (flaps added below)
    "L84 146 Q100 142 116 146 L116 156",              # turtleneck (covers neck)
    "L84 156 Q100 172 116 156",                       # hoodie (hood lobes added below)
    "L84 156 L100 196 L116 156",                      # suit jacket (deep V)
]
extra = {
    3: '<path d="M80 150 L102 184 L82 172 Z"/><path d="M120 150 L98 184 L118 172 Z"/>',
    5: '<path d="M70 160 C64 146 78 140 86 150 L86 158 Z"/><path d="M130 160 C136 146 122 140 114 150 L114 158 Z"/>',
    6: '<path d="M76 158 L100 200 L124 158 L112 158 L100 182 L88 158 Z" fill="#000" fill-opacity="0"/>',
}
for i, nl in enumerate(necklines):
    write(f"cloth-{i}", fill(f"{LEFT_TOP} {nl} {RIGHT_TOP}") + extra.get(i, ""))
# tank top: narrow straps, wide scoop
write("cloth-7", fill("M30 200 C32 184 50 172 66 166 L74 158 Q100 196 126 158 L134 166 C150 172 168 184 170 200 Z"))

# ---------------------------------------------------------------- accessories (fixed colours via manifest)
accs = {
    1: stroke("M63 90 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0", 3) + stroke("M107 90 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0", 3)
       + stroke("M93 88 Q100 83 107 88", 3) + stroke("M63 88 L50 84", 3) + stroke("M137 88 L150 84", 3),                      # round glasses
    2: '<rect x="62" y="78" width="32" height="24" rx="6" fill="none" stroke="#000" stroke-width="3"/><rect x="106" y="78" width="32" height="24" rx="6" fill="none" stroke="#000" stroke-width="3"/>'
       + stroke("M94 86 L106 86", 3) + stroke("M62 84 L50 81", 3) + stroke("M138 84 L150 81", 3),                               # square glasses
    3: '<rect x="60" y="78" width="36" height="24" rx="9" fill="#000" fill-opacity="0.92"/><rect x="104" y="78" width="36" height="24" rx="9" fill="#000" fill-opacity="0.92"/>'
       + stroke("M96 84 L104 84", 3.4) + stroke("M60 82 L50 80", 3) + stroke("M140 82 L150 80", 3),                             # sunglasses
    4: stroke("M84 160 Q100 192 116 160", 1.8) + '<rect x="98" y="176" width="4" height="17" rx="1"/><rect x="92.5" y="181" width="15" height="4" rx="1"/>',  # cross necklace
    5: '<circle cx="52" cy="116" r="4.2"/><circle cx="148" cy="116" r="4.2"/>',                                                  # earrings
}
for i, a in accs.items():
    write(f"acc-{i}", a)

n = len([f for f in os.listdir(OUT) if f.endswith(".svg")])
size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f"wrote {n} files, {size/1024:.1f} KB total -> {os.path.abspath(OUT)}")
