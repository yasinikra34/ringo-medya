# Genel giriş efekti montajı: yeşil silme + kapıya RR logo + soldan giriş + çıkış. Çıktı: üst yarı renk, alt yarı maske.
import cv2, numpy as np, glob, sys, os, json
cfg = json.loads(sys.argv[1])
fs = sorted(glob.glob(os.path.join(cfg['src'], '*.png'))); out = cfg['out']
W, H = 752, 416
REFH, LEN, DX, DY, LOGO = cfg['refh'], cfg['len'], cfg['dx'], cfg['dy'], cfg['logo']
tr = []
for f in fs:   # gövde takibi
    im = cv2.imread(f); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    ng = 255 - cv2.inRange(hsv, (35, 80, 80), (85, 255, 255))
    m = (cv2.inRange(hsv, (0, 0, 0), (180, 255, cfg.get('vmax', 255))) & ng) if cfg.get('vmax') else ng
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9) if cfg.get('vmax') else (15, 15), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2: tr.append(None); continue
    k = 1 + np.argmax(st[1:, 4]); x, y, w, h, a = st[k]; tr.append((x, x + w, y, h))
fr, top, sc = [], [], []
for t in tr:
    if t is None: fr.append(np.nan); top.append(np.nan); sc.append(np.nan); continue
    x0, x1, y, h = t; s = h / REFH
    fr.append(x1 if x1 < W - 3 else (x0 + LEN * s if x0 > 3 else np.nan)); top.append(y); sc.append(s)
def fill(a):
    a = np.array(a, float); i = np.arange(len(a)); ok = ~np.isnan(a)
    a = np.interp(i, i[ok], a[ok]); return np.convolve(np.pad(a, 3, mode='edge'), np.ones(7) / 7, 'valid')
fr, top, sc = fill(fr), fill(top), fill(sc)
logo0 = cv2.imread(cfg['logo_png'], cv2.IMREAD_UNCHANGED)
seq = [(i, 1) for i in range(cfg['in_end'])]
t = cfg['in_end']
while t <= cfg['last']: seq.append((int(t), 0)); t += cfg['step']
os.makedirs(out, exist_ok=True)
for n, (i, giris) in enumerate(seq):
    im = cv2.imread(fs[i]).astype(np.float32)
    b, g, r = im[..., 0], im[..., 1], im[..., 2]
    a = np.clip(1 - (g - np.maximum(r, b) - 18) / 55, 0, 1)
    im[..., 1] = np.minimum(g, np.maximum(r, b) + 6)
    yari = (a < 0.97) | ((g > r * 0.98) & (g > 110) & (b < g * 0.6))   # ışık izi/kenar ve yeşilimsi sarı: sıcak altına çevir
    lum = np.maximum(np.maximum(r, g), b)
    altin = np.stack([lum * 0.32, lum * 0.78, lum], -1)   # BGR: sıcak altın
    im = np.where(yari[..., None], altin, im)
    s = sc[i]; L = max(8, int(LOGO * s))
    lg = cv2.resize(logo0, (L, int(L * logo0.shape[0] / logo0.shape[1])), interpolation=cv2.INTER_AREA); lh = lg.shape[0]
    cx, cy = int(fr[i] - DX * s), int(top[i] + DY * s)
    x0, y0 = cx - L // 2, cy - lh // 2
    xs0, xs1, ys0, ys1 = max(0, x0), min(W, x0 + L), max(0, y0), min(H, y0 + lh)
    if xs1 > xs0 and ys1 > ys0:
        sub = im[ys0:ys1, xs0:xs1]
        luma = (0.3 * sub[..., 2] + 0.59 * sub[..., 1] + 0.11 * sub[..., 0])[..., None] / 255
        shade = np.clip(cfg.get('sh0', 0.72) + cfg.get('sh1', 0.55) * luma, 0.6, 1.25)
        Lc = lg[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0, :3].astype(np.float32) * shade
        A = lg[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0, 3:4].astype(np.float32) / 255 * 0.96 * a[ys0:ys1, xs0:xs1, None]
        im[ys0:ys1, xs0:xs1] = sub * (1 - A) + np.clip(Lc, 0, 255) * A
    if giris:
        e = 1 - (1 - i / (cfg['in_end'] - 1)) ** 3
        target = fr[cfg['in_end']]; shift = int(round(e * target - fr[i]))
        M = np.float32([[1, 0, shift], [0, 1, 0]])
        im = cv2.warpAffine(im, M, (W, H)); a = cv2.warpAffine(a, M, (W, H))
    msk = cv2.cvtColor((a * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cv2.imwrite(os.path.join(out, '%04d.png' % n), np.vstack([im.clip(0, 255).astype(np.uint8), msk]))
print(len(seq), 'kare', round(len(seq) / 24, 2), 'sn')
