#!/usr/bin/env python3
"""Instagram/TikTok gönderi görselleri (4:5, 1080x1350) + hikâye (9:16, 1080x1920): Grok görseli + gerçek logo + Türkçe yazı."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
U = '/mnt/user-data/uploads/'
LOGO = Image.open('/home/claude/ringo-core/public/kurumsal/assets/img/ringo-logo.png').convert('RGBA')
LOGO_Y = Image.open('/home/claude/ringo-core/public/kurumsal/assets/img/ringo-logo-yatay.png').convert('RGBA')
FB = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'; FM = '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'
RENK = [(255, 45, 149), (138, 63, 252), (47, 107, 255), (0, 194, 232), (255, 196, 0), (255, 122, 26)]
KOYU = (22, 18, 43)

def sigdir(src, w, h, ust):
    """Genişliğe ölçekle, 'ust' oranından itibaren h yüksekliğinde kırp."""
    im = Image.open(src).convert('RGB'); k = w / im.width
    im = im.resize((w, round(im.height * k)), Image.LANCZOS)
    y0 = int((im.height - h) * ust); return im.crop((0, y0, w, y0 + h)).convert('RGBA'), k, y0

def cizgi(d, cx, y, n=6, w=34):
    x0 = cx - n * w / 2
    for i in range(n): d.rounded_rectangle((x0 + i * w, y, x0 + i * w + w, y + 10), 5, fill=RENK[i] + (255,))

def baslik(im, satirlar, y, boy=78):
    d = ImageDraw.Draw(im); f = ImageFont.truetype(FB, boy)
    for i, s in enumerate(satirlar):
        d.text((im.width / 2, y + i * boy * 1.18), s, font=f, fill=KOYU, anchor='mt')
    cizgi(d, im.width / 2, y + len(satirlar) * boy * 1.18 + 14)

def alt_imza(im, y):
    d = ImageDraw.Draw(im); lg = LOGO_Y.resize((200, round(200 * LOGO_Y.height / LOGO_Y.width)), Image.LANCZOS)
    f = ImageFont.truetype(FM, 34); t = 'ringolounge.com'; tw = d.textlength(t, font=f)
    x = (im.width - (lg.width + 22 + tw)) / 2
    im.alpha_composite(lg, (int(x), int(y - lg.height / 2))); d.text((x + lg.width + 22, y), t, font=f, fill=KOYU, anchor='lm')

def cok_yakinda(im, cx, y, boy=110):
    d = ImageDraw.Draw(im); f = ImageFont.truetype(FB, boy); s = 'Çok yakında'
    x = cx - d.textlength(s, font=f) / 2
    for k, ch in enumerate(s):
        d.text((x, y), ch, font=f, fill=RENK[[0, 1, 1, 2, 2, 2, 3, 3, 4, 5, 5][k]], anchor='ls'); x += d.textlength(ch, font=f)

def g1(w, h, logo_y, logo_h, kar_y, kar_w, yazi_y):
    """Boş beyaz tuval: üstte gerçek logo, ortada Grok'un 4 yoldaşı (halkasız kırpım), altta yazılar."""
    im = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    src = Image.open(U + '2f881867-image.jpg').convert('RGBA')
    ImageDraw.Draw(src).rectangle((380, 790, 800, 831), fill=(255, 255, 255, 255))  # halkanın alt kenarı
    kar = src.crop((30, 800, 1130, 1480))                  # 4 yoldaş + alt konfeti
    kar = kar.resize((kar_w, round(kar.height * kar_w / kar.width)), Image.LANCZOS)
    ust = src.crop((30, 230, 1130, 330)).resize((kar_w, round(100 * kar_w / 1100)), Image.LANCZOS)  # üst konfeti şeridi
    im.alpha_composite(ust, ((w - kar_w) // 2, max(0, logo_y - 40)))
    lg = LOGO.resize((round(LOGO.width * logo_h / LOGO.height), logo_h), Image.LANCZOS)
    im.alpha_composite(lg, ((w - lg.width) // 2, logo_y))
    im.alpha_composite(kar, ((w - kar_w) // 2, kar_y))
    cok_yakinda(im, w / 2, yazi_y)
    d = ImageDraw.Draw(im); d.text((w / 2, yazi_y + 40), 'Sohbet · Oyun · Hediye · Yoldaş', font=ImageFont.truetype(FM, 40), fill=KOYU, anchor='mt')
    alt_imza(im, h - (70 if h < 1500 else 300))
    return im

def kart(src, ust, satirlar, w=1080, h=1350, y=95):
    im, _, _ = sigdir(src, w, h, ust)
    baslik(im, satirlar, y); alt_imza(im, h - 70); return im

if __name__ == '__main__':
    o = '/home/claude/sm/'
    g1(1080, 1350, 70, 420, 500, 980, 1155).convert('RGB').save(o + 'G1-cok-yakinda.jpg', quality=92)
    kart(U + '92eada94-image.jpg', .5, ['Canlı sesli odalarda', 'sohbet et']).convert('RGB').save(o + 'G2-sohbet.jpg', quality=92)
    kart(U + '9a79f721-image.jpg', .55, ['28 oyun,', 'arkadaşlarınla oyna']).convert('RGB').save(o + 'G3-oyun.jpg', quality=92)
    kart(U + 'e777cd70-image.jpg', .2, ['Hediyelerle', 'sevdiğini mutlu et']).convert('RGB').save(o + 'G4-hediye.jpg', quality=92)
    # Hikâye (9:16) sürümü: G1
    g1(1080, 1920, 230, 520, 790, 1040, 1440).convert('RGB').save(o + 'H1-cok-yakinda-hikaye.jpg', quality=92)
