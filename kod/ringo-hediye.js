/* Ringo Hediye — PK hediye animasyonları ve gönderme paneli (site sürümü)
   Katalog sunucudan gelir (ringo_gift_catalog). Fiyat = jeton = PK puanı.
     RingoHediye.katalog(rows)                         // /api/pk/match → gifts
     RingoHediye.panelAc({ bakiye, hedefler:[{id,ad}], hedef, gonder: async (hediye, hedefId) => {...} })
     RingoHediye.oynat(kod, { kimden, kime })          // pk-gift-created olayında HERKESTE çağrılır
   'video' hediyeleri yayının üstünde şeffaf efekt olarak oynar; 'face' hediyeleri yalnızca bildirim gösterir
   (yüze takma işini RingoYuz yapar).
*/
(function (G) {
'use strict';
if (G.RingoHediye) return;
let KATALOG = [];
let BY = {};
let YOL = '/assets/hediyeler/';
const YUZ_YOL = '/assets/yuz/';
const fmt = n => Math.round(Number(n) || 0).toLocaleString('tr-TR');
const kac = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function katalog(rows) {
  KATALOG = (rows || []).map(r => ({
    id: String(r.code), ad: String(r.name || r.code), fiyat: Number(r.unit_price) || 0,
    dosya: r.asset_key ? String(r.asset_key).replace(/[^A-Za-z0-9_-]/g, '') : '',
    efekt: r.effect === 'video', yuz: r.effect === 'face'
  }));
  BY = {}; KATALOG.forEach(h => BY[h.id] = h);
  if (panel.classList.contains('on')) { izgara(); durum(); }
}
function resimYolu(h) { return !h.dosya ? '' : h.yuz ? YUZ_YOL + h.dosya + '.webp' : YOL + h.dosya + '.jpg'; }

/* ---------- stil ---------- */
const css = `
#rhEfekt{position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;pointer-events:none;opacity:0;transition:opacity .35s}
#rhEfekt.on{opacity:1}
#rhBildirim{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top));z-index:2147483001;transform:translate(-50%,calc(-100% - 40px));opacity:0;visibility:hidden;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .25s,visibility 0s .35s;display:flex;align-items:center;gap:10px;max-width:92vw;padding:8px 14px 8px 8px;border-radius:999px;background:rgba(255,255,255,.97);border:1.5px solid #ff2bd6;box-shadow:0 10px 26px rgba(155,43,255,.25);color:#1d1230;font:600 13px -apple-system,"Segoe UI",Roboto,Arial,sans-serif;pointer-events:none}
#rhBildirim.on{transform:translate(-50%,0);opacity:1;visibility:visible;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .25s}
#rhBildirim img{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#f6f0ff}
#rhBildirim b{color:#9b2bff}
#rhPanelArka{position:fixed;inset:0;z-index:2147482000;background:rgba(29,18,48,.28);opacity:0;pointer-events:none;transition:opacity .25s}
#rhPanelArka.on{opacity:1;pointer-events:auto}
#rhPanel{position:fixed;left:0;right:0;bottom:0;z-index:2147482001;max-width:560px;margin:0 auto;border-radius:26px 26px 0 0;padding:14px 16px calc(16px + env(safe-area-inset-bottom));
 background:linear-gradient(90deg,#ff2bd6,#ff8a00,#ffd400,#22d94a,#16a6ff,#9b2bff) top/100% 4px no-repeat,#fff;
 box-shadow:0 -14px 40px rgba(155,43,255,.18);transform:translateY(105%);transition:transform .32s cubic-bezier(.2,.8,.2,1);font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1d1230;user-select:none;-webkit-user-select:none}
#rhPanel.on{transform:none}
#rhPanel .rh-tut{width:44px;height:5px;border-radius:3px;background:#e6dcf5;margin:0 auto 12px}
#rhPanel .rh-ust{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
#rhPanel .rh-ust b{font:800 18px -apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.5px;background:linear-gradient(90deg,#ff2bd6,#9b2bff);-webkit-background-clip:text;background-clip:text;color:transparent}
#rhPanel .rh-bak{display:flex;align-items:center;gap:6px;font-size:15px;font-weight:800;color:#ff8a00}
.rh-coin{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#fff3a6,#ffd400 45%,#ff8a00 100%);box-shadow:inset 0 0 0 1.5px #e07800;display:inline-block}
#rhPanel .rh-kime{display:flex;gap:8px;margin-bottom:12px}
#rhPanel .rh-kime button{flex:1;height:38px;border-radius:12px;border:1.5px solid #e6dcf5;background:#faf7ff;color:#6b5b84;font-weight:700;font-size:14px}
#rhPanel .rh-kime button.on{border-color:#ff2bd6;background:linear-gradient(90deg,#ff2bd6,#9b2bff);color:#fff}
#rhPanel .rh-izgara{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;max-height:46vh;overflow:auto;padding:2px}
.rh-kart{border-radius:14px;overflow:hidden;background:#fff;border:1.5px solid #efe7fb;text-align:center;padding-bottom:7px;box-shadow:0 3px 10px rgba(155,43,255,.07);transition:border-color .15s,transform .15s,box-shadow .15s}
.rh-kart.sec{border-color:#ff2bd6;transform:translateY(-2px);box-shadow:0 6px 16px rgba(255,43,214,.25)}
.rh-kart .rh-res{aspect-ratio:3/4;background:#f6f0ff center/cover no-repeat}
.rh-kart i{display:block;font-style:normal;font-size:12px;font-weight:700;color:#1d1230;margin:6px 4px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rh-kart span{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:800;color:#ff8a00}
.rh-kart span .rh-coin{width:12px;height:12px}
.rh-kart span.rh-hak{color:#9b2bff}
#rhPanel .rh-alt{display:flex;gap:10px;margin-top:14px}
#rhPanel .rh-gonder{flex:1;height:54px;border:0;border-radius:16px;font:800 18px -apple-system,Segoe UI,sans-serif;background:linear-gradient(90deg,#ff2bd6,#9b2bff);color:#fff;box-shadow:0 8px 18px rgba(255,43,214,.3)}
#rhPanel .rh-gonder:disabled{opacity:.4}
#rhPanel .rh-uyari{height:18px;margin-top:8px;text-align:center;font-size:13px;color:#ff2bd6}
.rh-kart .rh-res.bos{display:grid;place-items:center;font-size:28px}
#rhPanel .rh-uyari.ok{color:#22a83c}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

/* ---------- ses: Web Audio (telefonda ilk dokunuşta açılır) ---------- */
let actx = null; const tamponlar = {};
function kilitAc() {
  try { if (!actx) actx = new (G.AudioContext || G.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {}
}
document.addEventListener('pointerdown', kilitAc, { capture: true });
function sesYukle(h) {
  if (!h.dosya || !h.efekt) return Promise.resolve(null);
  if (!tamponlar[h.dosya]) tamponlar[h.dosya] = fetch(YOL + 'ses/' + h.dosya + '.mp3').then(r => r.ok ? r.arrayBuffer() : null)
    .then(b => b && actx ? new Promise((ok, no) => actx.decodeAudioData(b, ok, no)) : null).catch(() => null);
  return tamponlar[h.dosya];
}
async function sesCal(h) {
  if (!actx) return null;
  const buf = await sesYukle(h); if (!buf) return null;
  const src = actx.createBufferSource(), g = actx.createGain();
  src.buffer = buf; src.connect(g); g.connect(actx.destination); src.start();
  return { dur() { try { g.gain.setTargetAtTime(0, actx.currentTime, 0.12); setTimeout(() => { try { src.stop(); } catch (e) {} }, 500); } catch (e) {} } };
}

/* ---------- bildirim ---------- */
const bild = document.createElement('div'); bild.id = 'rhBildirim'; document.body.appendChild(bild);
let bildT = 0;
function bildir(h, bilgi) {
  const r = resimYolu(h);
  bild.innerHTML = (r ? '<img src="' + r + '" alt="">' : '') + '<span><b>' + kac(bilgi && bilgi.kimden || 'Biri') + '</b> ' +
    kac(bilgi && bilgi.kime ? (bilgi.kime === 'Sana' ? 'sana ' : bilgi.kime + ' için ') : '') + kac(h.ad) + ' gönderdi</span>';
  bild.classList.add('on'); clearTimeout(bildT); bildT = setTimeout(() => bild.classList.remove('on'), 3200);
}

/* ---------- şeffaf efekt oynatıcı (üst yarı renk, alt yarı şeffaflık) ---------- */
const video = document.createElement('video');
video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', ''); video.muted = true; video.preload = 'auto';
video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px';
document.body.appendChild(video);
const ef = { cv: null, gl: null, tex: null, prog: null, uS: null, raf: 0 };
function efektHazir() {
  if (ef.gl) return true;
  const cv = document.createElement('canvas'); cv.id = 'rhEfekt';
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return false;
  const vs = 'attribute vec2 p;varying vec2 uv;uniform vec2 S;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);uv=(uv-.5)/S+.5;gl_Position=vec4(p,0.,1.);}';
  const fs = 'precision mediump float;varying vec2 uv;uniform sampler2D t;void main(){if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(0.);return;}vec3 c=texture2D(t,vec2(uv.x,uv.y*.5)).rgb;float a=texture2D(t,vec2(uv.x,.5+uv.y*.5)).r;a=smoothstep(.04,.98,a);gl_FragColor=vec4(c*a,a);}';
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  Object.assign(ef, { cv, gl, tex, prog: pr, uS: gl.getUniformLocation(pr, 'S') });
  // Telefonun ekran kartı bağlamı düşerse (bellek/ekran kartı sıkışması) efekt katmanı hemen kaldırılır;
  // sayfa beyaz kalmaz, sonraki hediyede yeniden kurulur.
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(ef.raf); try { cv.remove(); } catch (_) {} ef.cv = ef.gl = null; try { video.pause(); } catch (_) {} });
  document.body.appendChild(cv);
  return true;
}
function efektCiz() {
  const { cv, gl } = ef; if (!gl) return; const d = Math.min(1.5, window.devicePixelRatio || 1);
  const w = Math.round(innerWidth * d), h = Math.round(innerHeight * d);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  gl.viewport(0, 0, w, h);
  // ekranı kaplayacak şekilde (cover) 9:16 kare
  const ar = w / h, va = 9 / 16; const S = ar > va ? [1, ar / va] : [va / ar, 1];
  gl.uniform2f(ef.uS, S[0], S[1]);
  if (video.readyState >= 2) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); } catch (e) {} }
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  ef.raf = requestAnimationFrame(efektCiz);
}
const kuyruk = []; let oynuyor = false;
const bekle = ms => new Promise(r => setTimeout(r, ms));
function oynat(id, bilgi) {
  const h = BY[id]; if (!h) return Promise.resolve(null);
  bildir(h, bilgi);
  if (!h.efekt || !h.dosya) return Promise.resolve(h);   // yüz hediyesi / animasyonsuz hediye: sadece bildirim
  return new Promise(res => { kuyruk.push({ h, res }); if (!oynuyor) sira(); });
}
async function sira() {
  oynuyor = true;
  while (kuyruk.length) {
    // çok hediye birikirse küçükleri atla, en değerli 6 hediyeyi göster
    if (kuyruk.length > 6) { kuyruk.sort((a, b) => b.h.fiyat - a.h.fiyat); kuyruk.splice(6).forEach(k => k.res(k.h)); }
    const { h, res } = kuyruk.shift();
    await sahneOynat(h);
    res(h);
    if (kuyruk.length) await bekle(250);
  }
  oynuyor = false;
}
function sahneOynat(h) {
  return new Promise(async res => {
    if (!efektHazir()) return res();
    let bitti = false, t1 = 0, s = null;
    const bitir = async () => {
      if (bitti) return; bitti = true; clearTimeout(t1);
      if (ef.cv) ef.cv.classList.remove('on'); if (s) s.dur();
      await bekle(380); video.pause(); cancelAnimationFrame(ef.raf); res();
    };
    const dosya = YOL + h.dosya + '-efekt.mp4';
    if (video.getAttribute('src') !== dosya) video.src = dosya; else try { video.currentTime = 0; } catch (e) {}
    video.onended = bitir; video.onerror = () => setTimeout(bitir, 600);
    await Promise.race([new Promise(r => video.addEventListener('canplay', r, { once: true })), bekle(4000)]);
    if (!ef.gl) return bitir();
    cancelAnimationFrame(ef.raf); efektCiz(); ef.cv.classList.add('on');
    try { await video.play(); } catch (e) {}
    s = await sesCal(h);
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    const sure = isFinite(video.duration) && video.duration > 0 ? video.duration : 23.5;
    t1 = setTimeout(bitir, Math.ceil(sure * 1000) + 1500);
  });
}

/* ---------- gönderme paneli ---------- */
const arka = document.createElement('div'); arka.id = 'rhPanelArka';
const panel = document.createElement('div'); panel.id = 'rhPanel';
panel.innerHTML = '<div class="rh-tut"></div><div class="rh-ust"><b>Hediye Gönder</b><div class="rh-bak"><i class="rh-coin"></i><span class="rh-bakv">0</span></div></div>' +
  '<div class="rh-kime"></div><div class="rh-izgara"></div><div class="rh-alt"><button class="rh-gonder" disabled>Gönder</button></div><div class="rh-uyari"></div>';
document.body.appendChild(arka); document.body.appendChild(panel);
const $p = s => panel.querySelector(s);
let ayar = null, secili = null, hedef = null, gonderiliyor = false;
function izgara() {
  $p('.rh-izgara').innerHTML = KATALOG.length ? KATALOG.map(h => { const r = resimYolu(h);
    return '<div class="rh-kart' + (secili === h.id ? ' sec' : '') + '" data-id="' + kac(h.id) + '">' +
      (r ? '<div class="rh-res" style="background-image:url(' + r + ');' + (h.yuz ? 'background-size:contain;background-color:#140a1c' : '') + '"></div>' : '<div class="rh-res bos">🎁</div>') +
      '<i>' + kac(h.ad) + '</i>' + (hak(h) ? '<span class="rh-hak">🌹 Ücretsiz ×' + fmt(hak(h)) + '</span>' : '<span><i class="rh-coin"></i>' + fmt(h.fiyat) + '</span>') + '</div>'; }).join('')
    : '<p style="grid-column:1/-1;text-align:center;color:#bfa9d6">Hediye kataloğu boş.</p>';
}
function kime() {
  const hs = (ayar && ayar.hedefler) || [];
  $p('.rh-kime').style.display = hs.length ? 'flex' : 'none';
  $p('.rh-kime').innerHTML = hs.map(x => '<button data-id="' + kac(x.id) + '" class="' + (x.id === hedef ? 'on' : '') + '">' + kac(x.ad) + '</button>').join('');
}
// Ücretsiz hediye hakkı (şampiyon ödülü, ör. Gül): varsa jeton gerekmez
function hak(h) { return h && ayar && ayar.haklar ? Math.max(0, Number(ayar.haklar[h.id]) || 0) : 0; }
function durum(mesaj, iyi) {
  const h = BY[secili], b = ayar ? Number(ayar.bakiye) || 0 : 0, yetmez = !!(h && h.fiyat > b && !hak(h));
  $p('.rh-bakv').textContent = fmt(b);
  const btn = $p('.rh-gonder'), u = $p('.rh-uyari');
  btn.disabled = !h || !hedef || gonderiliyor || yetmez;
  btn.textContent = gonderiliyor ? 'Gönderiliyor…' : h ? h.ad + ' Gönder' : 'Hediye seç';
  u.classList.toggle('ok', !!iyi);
  u.textContent = mesaj || (yetmez ? 'Jeton bakiyen yetersiz' : !hedef ? ((ayar && ayar.uyari) || 'Yarışmacı seç') : '');
}
function onyukle(h) {
  if (!h || !h.efekt || !h.dosya) return;
  kilitAc(); sesYukle(h);
  if (!oynuyor) { const f = YOL + h.dosya + '-efekt.mp4'; if (video.getAttribute('src') !== f) { video.src = f; video.load(); } }
}
$p('.rh-izgara').addEventListener('click', e => { const k = e.target.closest('.rh-kart'); if (!k) return; secili = k.dataset.id; izgara(); durum(); onyukle(BY[secili]); });
$p('.rh-kime').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; hedef = b.dataset.id; kime(); durum(); });
$p('.rh-gonder').addEventListener('click', async () => {
  const h = BY[secili]; if (!h || !ayar || !hedef || gonderiliyor) return;
  gonderiliyor = true; durum();
  try {
    const sonuc = ayar.gonder ? await ayar.gonder(h, hedef) : null;
    if (sonuc && typeof sonuc.bakiye === 'number') ayar.bakiye = sonuc.bakiye;
    if (sonuc && sonuc.haklar) { ayar.haklar = sonuc.haklar; izgara(); }
    gonderiliyor = false; durum(h.ad + ' gönderildi', true);
    setTimeout(panelKapat, 450);
  } catch (e) { gonderiliyor = false; if (e && typeof e.bakiye === 'number') ayar.bakiye = e.bakiye; durum((e && e.message) || 'Gönderilemedi'); }
});
arka.addEventListener('click', () => panelKapat());
function panelAc(o) {
  ayar = o || {}; const hs = ayar.hedefler || [];
  hedef = ayar.hedef || (hs.find(x => x.id === hedef) ? hedef : (hs[0] && hs[0].id)) || null;
  izgara(); kime(); durum();
  arka.classList.add('on'); panel.classList.add('on');
}
function panelKapat() { arka.classList.remove('on'); panel.classList.remove('on'); }

G.RingoHediye = {
  katalog, oynat, panelAc, panelKapat, kilitAc,
  ayarla(o) { if (o && o.yol) YOL = o.yol.replace(/\/?$/, '/'); },
  bakiyeGuncelle(v) { if (ayar) { ayar.bakiye = v; durum(); } },
  hediye(id) { return BY[id] || null; },
  get oynuyor() { return oynuyor; }
};
})(window);
