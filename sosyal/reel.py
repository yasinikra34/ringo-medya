#!/usr/bin/env python3
"""Ringo 'Çok yakında' Reels/TikTok montajı — 1080x1920, 24 fps, sessiz (müzik platformun kütüphanesinden).
Sahneler: logo açılışı → yoldaşlar → canlı oda → oyunlar → hediyeler → kapanış."""
import subprocess, numpy as np, random, math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 24
U = '/mnt/user-data/uploads/'
V_DAMLA = U + '329466d7-1000023424.mp4'
V_YOLDAS = U + '2185da8f-1000023427.mp4'
V_ODA = U + '820b233b-1000023428.mp4'
HED = '/home/claude/ringo-medya/hediyeler/'
KAP = '/home/claude/ringo-core/public/assets/games/'
LOGO = Image.open('/home/claude/ringo-core/public/kurumsal/assets/img/ringo-logo.png').convert('RGBA')
F_B = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
F_M = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'
RENK = [(255, 45, 149), (138, 63, 252), (47, 107, 255), (0, 194, 232), (255, 196, 0), (255, 122, 26)]
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/sm/ringo-cok-yakinda.mp4'
random.seed(7)

def video_kareleri(path, bas, sure, w=None, h=None):
    """Videoyu bas..bas+sure aralığında 24 fps kare listesi olarak okur (RGB numpy)."""
    w = w or W
    vf = f'fps={FPS},scale={w}:-2:flags=lanczos,crop={w}:{h or H}' if h is None or True else ''
    p = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(bas), '-t', str(sure), '-i', path, '-vf',
                        f'fps={FPS},scale={W}:-2:flags=lanczos,crop={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True).stdout
    n = len(p) // (W * H * 3)
    return [np.frombuffer(p, np.uint8, W * H * 3, i * W * H * 3).reshape(H, W, 3) for i in range(n)]

def zemin():
    """Beyaz + köşelerde yumuşak pembe/mavi/sarı ışık."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    im = np.full((H, W, 3), 255, np.float32)
    for (cx, cy, c) in [(.1, .08, RENK[0]), (.95, .3, RENK[2]), (.1, .85, RENK[3]), (.9, .95, RENK[4])]:
        d = np.sqrt((x - cx * W) ** 2 + (y - cy * H) ** 2) / (W * .75)
        a = np.clip(1 - d, 0, 1)[..., None] ** 2 * .16
        im = im * (1 - a) + np.array(c, np.float32) * a
    return im.astype(np.uint8)
ZEMIN = zemin()

def yazi_karti(metin, alt=None):
    """Üstte beyaz hap üzerinde koyu yazı + gökkuşağı çizgi (RGBA)."""
    f = ImageFont.truetype(F_B, 62)
    d0 = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    tw = d0.textbbox((0, 0), metin, font=f)[2]
    pw, ph = min(W - 80, tw + 110), 150
    im = Image.new('RGBA', (pw + 60, ph + 60), (0, 0, 0, 0))
    gol = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(gol).rounded_rectangle((30, 40, 30 + pw, 40 + ph), 75, fill=(138, 63, 252, 70))
    im = Image.alpha_composite(im, gol.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((30, 30, 30 + pw, 30 + ph), 75, fill=(255, 255, 255, 240))
    d.text((30 + pw / 2, 30 + ph / 2 - 8), metin, font=f, fill=(22, 18, 43), anchor='mm')
    bx0, bx1, by = 30 + pw / 2 - 90, 30 + pw / 2 + 90, 30 + ph - 30
    for i, c in enumerate(RENK):
        d.rounded_rectangle((bx0 + i * 30, by, bx0 + i * 30 + 30, by + 8), 4, fill=c + (255,))
    return im

def ustune(kare, rgba, x, y, alfa=1.0):
    im = Image.fromarray(kare).convert('RGBA')
    if alfa < 1:
        r = rgba.copy(); r.putalpha(r.getchannel('A').point(lambda v: int(v * alfa))); rgba = r
    im.alpha_composite(rgba, (int(x), int(y)))
    return np.asarray(im.convert('RGB'))

def baslik_ekle(kareler, metin):
    k = yazi_karti(metin); x = (W - k.width) / 2
    out = []
    for i, f in enumerate(kareler):
        t = min(1, i / 7)  # 7 karede kayarak gelir
        e = 1 - (1 - t) ** 3
        out.append(ustune(f, k, x, 170 - (1 - e) * 60, e))
    return out

class Konfeti:
    def __init__(self, n=120, patlama=None):
        self.p = []
        for _ in range(n):
            if patlama:
                a = random.uniform(0, 2 * math.pi); v = random.uniform(400, 1500)
                self.p.append([patlama[0], patlama[1], math.cos(a) * v, math.sin(a) * v - 500, random.uniform(0, 6), random.uniform(-8, 8), random.choice(RENK), random.uniform(14, 26)])
            else:
                self.p.append([random.uniform(0, W), random.uniform(-H, 0), random.uniform(-60, 60), random.uniform(250, 500), random.uniform(0, 6), random.uniform(-6, 6), random.choice(RENK), random.uniform(14, 24)])
    def ciz(self, kare, dt=1 / FPS):
        im = Image.fromarray(kare); d = ImageDraw.Draw(im)
        for q in self.p:
            q[0] += q[2] * dt; q[1] += q[3] * dt; q[3] += 900 * dt; q[2] *= .985; q[4] += q[5] * dt
            s = q[7]; c, sn = math.cos(q[4]), math.sin(q[4])
            pts = [(q[0] + dx * c - dy * sn, q[1] + dx * sn + dy * c) for dx, dy in [(-s / 2, -s / 4), (s / 2, -s / 4), (s / 2, s / 4), (-s / 2, s / 4)]]
            d.polygon(pts, fill=q[6])
        return np.asarray(im)

def logo_pop(kareler_say, olcek_son=1.55, y_merkez=H * .45, konfeti=True):
    out = []; kf = Konfeti(150, (W / 2, y_merkez)) if konfeti else None
    for i in range(kareler_say):
        t = i / FPS
        # yay gibi büyüme: 0.6 → 1.08 → 1.0
        s = 1 - math.exp(-7 * t) * math.cos(9 * t) * .45
        sc = olcek_son * max(.2, s)
        lg = LOGO.resize((int(LOGO.width * sc * .8), int(LOGO.height * sc * .8)), Image.LANCZOS)
        f = ustune(ZEMIN, lg, (W - lg.width) / 2, y_merkez - lg.height / 2, min(1, t * 6))
        if kf: f = kf.ciz(f)
        out.append(f)
    return out

def sahne_logo():
    damla = video_kareleri(V_DAMLA, 0, 2.0)
    flas = []
    for i in range(4):  # beyaz parlama
        a = 1 - i / 4
        flas.append((damla[-1] * (1 - a) + 255 * a).astype(np.uint8))
    return damla + flas + logo_pop(int(2.4 * FPS))

def sahne_oyunlar():
    adlar = ['01-101-okey', '06-tavla', '03-ringo-51', '07-domino', '02-koz-maca', '10-bilardo', '04-ringo-pisti', '11-dart', '05-batak']
    out = []
    for j, a in enumerate(adlar):
        k = Image.open(KAP + a + '.jpg').convert('RGB')
        n = int(.5 * FPS)
        for i in range(n):
            z = 1 + .05 * i / n
            cw, ch = int(940 * z), int(627 * z)
            c = k.resize((cw, ch), Image.LANCZOS)
            m = Image.new('L', (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw, ch), 44, fill=255)
            c = c.convert('RGBA'); c.putalpha(m)
            out.append(ustune(ZEMIN, c, (W - cw) / 2, H * .52 - ch / 2))
    return out

def hediye(ad, bas, sure):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(bas), '-t', str(sure), '-i', HED + ad + '-efekt.mp4', '-vf', f'fps={FPS}',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    n = len(p) // (540 * 1920 * 3); out = []
    z = ZEMIN.astype(np.float32)
    for i in range(n):
        a = np.frombuffer(p, np.uint8, 540 * 1920 * 3, i * 540 * 1920 * 3).reshape(1920, 540, 3)
        col = np.asarray(Image.fromarray(a[:960]).resize((W, H), Image.LANCZOS), np.float32)
        al = np.asarray(Image.fromarray(a[960:, :, 0]).resize((W, H), Image.LANCZOS), np.float32)[..., None] / 255
        out.append((col * al + z * (1 - al)).clip(0, 255).astype(np.uint8))
    return out

def sahne_kapanis():
    out = logo_pop(int(5 * FPS), olcek_son=1.3, y_merkez=H * .40)
    f1 = ImageFont.truetype(F_B, 104); f2 = ImageFont.truetype(F_M, 50)
    son = []
    for i, f in enumerate(out):
        t = max(0, min(1, (i - 10) / 8))
        im = Image.fromarray(f).convert('RGBA'); lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        # gökkuşağı yazı: harf harf renk
        yazi = 'Çok yakında'; x0 = W / 2 - d.textlength(yazi, font=f1) / 2; x = x0
        for k, ch in enumerate(yazi):
            c = RENK[[0, 1, 1, 2, 2, 2, 3, 3, 4, 5, 5][k % 11]]
            d.text((x, H * .66), ch, font=f1, fill=c + (int(255 * t),), anchor='ls'); x += d.textlength(ch, font=f1)
        d.text((W / 2, H * .66 + 95), 'ringolounge.com  ·  @ringolounge', font=f2, fill=(22, 18, 43, int(255 * t)), anchor='ms')
        im.alpha_composite(lay); son.append(np.asarray(im.convert('RGB')))
    return son

SARKI = '/home/claude/sm/sarki.mp3'; SARKI_BAS = 145.0   # son nakarat (2:25), 4 sn'lik ölçüler

def sahne_logo4():
    damla = video_kareleri(V_DAMLA, 0, 1.6)[:38]
    flas = [(damla[-1] * (1 - (1 - i / 4)) + 255 * (1 - i / 4)).astype(np.uint8) for i in range(4)]
    return damla + flas + logo_pop(96 - len(damla) - 4)

def kapaklar(adlar, sure):
    out = []; n = max(1, int(sure * FPS / len(adlar)))
    for a in adlar:
        k = Image.open(KAP + a + '.jpg').convert('RGB')
        for i in range(n):
            z = 1 + .05 * i / n; cw, ch = int(940 * z), int(627 * z)
            c = k.resize((cw, ch), Image.LANCZOS).convert('RGBA')
            m = Image.new('L', (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw, ch), 44, fill=255); c.putalpha(m)
            out.append(ustune(ZEMIN, c, (W - cw) / 2, H * .52 - ch / 2))
    return out

def tam(kareler, n):  # tam n kare (ölçüye oturt)
    kareler = list(kareler)
    while len(kareler) < n: kareler.append(kareler[-1])
    return kareler[:n]

def main():
    S = 96  # 4 sn
    sahneler = [
        tam(sahne_logo4(), S),                                                                     # Ringo'ya gel
        tam(baslik_ekle(video_kareleri(V_ODA, 0, 2), 'Sohbet burada'), S // 2)                      # Sohbet burada,
        + tam(baslik_ekle(kapaklar(['01-101-okey', '06-tavla', '03-ringo-51', '07-domino'], 2), 'Oyun burada'), S // 2),  # oyun burada
        tam(baslik_ekle(video_kareleri(V_YOLDAS, 1.2, 4), 'Yoldaşını seç, birlikte büyüt'), S),        # Ringo'ya gel
        tam(baslik_ekle(hediye('kalp-yagmuru', 1.6, 2), 'Eğlence burada'), S // 2)                    # Eğlence burada,
        + tam(baslik_ekle(video_kareleri(V_YOLDAS, 6.0, 2), 'Dostluk burada'), S // 2),               # dostluk burada
        tam(baslik_ekle(video_kareleri(V_ODA, 2, 6), 'Canlı sesli odalarda sohbet et'), S + S // 2)   # Ringo'ya gel / birlikte gül
        + tam(baslik_ekle(hediye('gokkusagi', 1.8, 1) + hediye('balon', 1.6, 1), 'Hediyelerle sevdiğini mutlu et'), S // 2),
        tam(baslik_ekle(kapaklar(['02-koz-maca', '10-bilardo', '04-ringo-pisti', '11-dart', '05-batak', '01-101-okey', '06-tavla', '07-domino'], 4),
                        '28 oyun, arkadaşlarınla oyna'), S),                                           # Ringo'ya gel
        tam(sahne_kapanis(), int(5 * FPS)),                                                          # Kalbini aç, oyuna başla
    ]
    toplam = sum(len(x) for x in sahneler); sure = toplam / FPS
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-ss', str(SARKI_BAS), '-t', str(sure), '-i', SARKI,
                            '-af', f'afade=t=in:d=0.05,afade=t=out:st={sure - 1.6}:d=1.6',
                            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                            '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT], stdin=subprocess.PIPE)
    for x in sahneler:
        for f in x: enc.stdin.write(np.ascontiguousarray(f, np.uint8).tobytes())
    enc.stdin.close(); enc.wait()
    print('kare', toplam, 'sure', round(sure, 2), 'sn ->', OUT)

if __name__ == '__main__':
    main()
