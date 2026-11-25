// Ringo kurumsal site — ortak üst çubuk, alt bilgi, canlı veri ve form.
(function () {
  var APP = 'https://ringolounge.com';
  // Uygulamanın kendi adresinde (ringolounge.com/kurumsal/) aynı kaynak; tanıtım adresinde uygulamaya istek atılır.
  var API = /(^|\.)ringolounge\.com$/.test(location.hostname) && location.hostname.indexOf('kurumsal.') !== 0 ? '' : APP;
  var sayfa = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';

  var MENU = [['index', 'Ana Sayfa'], ['altyapi', 'Altyapı'], ['durum', 'Sistem Durumu'], ['basin', 'Basın Kiti'], ['iletisim', 'İletişim']];
  function ust() {
    var h = document.createElement('header'); h.className = 'ust';
    h.innerHTML = '<div class="kap"><a class="logo" href="index.html" aria-label="Ringo ana sayfa"><img src="assets/img/ringo-logo-yatay.webp" alt="Ringo" width="96" height="46"></a>'
      + '<nav class="menu" id="menu">' + MENU.map(function (m) { return '<a href="' + m[0] + '.html"' + (m[0] === sayfa ? ' class="aktif"' : '') + '>' + m[1] + '</a>'; }).join('')
      + '<a class="dugme ana" href="' + APP + '/">Ringo\'ya Gir</a></nav>'
      + '<button class="menu-ac" aria-label="Menü" aria-expanded="false"><span></span><span></span><span></span></button></div>';
    document.body.prepend(h);
    var b = h.querySelector('.menu-ac'), n = h.querySelector('.menu');
    b.onclick = function () { var a = n.classList.toggle('acik'); b.setAttribute('aria-expanded', a); };
  }
  function alt() {
    var f = document.createElement('footer'); f.className = 'alt-bilgi';
    f.innerHTML = '<div class="kap"><div><img src="assets/img/ringo-logo-yatay.webp" alt="Ringo" width="112" height="54">'
      + '<p>Ringo; canlı odalar, DJ Lounge, PK yarışmaları, hediyeler ve onlarca oyunu tek çatı altında toplayan Türk sosyal eğlence platformudur.</p></div>'
      + '<div><h4>Ringo</h4><ul><li><a href="' + APP + '/">Uygulamaya Gir</a></li><li><a href="altyapi.html">Altyapı ve Güvenlik</a></li><li><a href="durum.html">Sistem Durumu</a></li><li><a href="basin.html">Basın Kiti</a></li><li><a href="iletisim.html">İletişim</a></li></ul></div>'
      + '<div><h4>Yasal</h4><ul><li><a href="' + APP + '/yasal/gizlilik.html">Gizlilik Politikası</a></li><li><a href="' + APP + '/yasal/kullanim-kosullari.html">Kullanım Koşulları</a></li><li><a href="' + APP + '/yasal/platform-kurallari.html">Platform Kuralları</a></li><li><a href="' + APP + '/cocuk-guvenligi.html">Çocuk Güvenliği</a></li><li><a href="' + APP + '/hesap-sil.html">Hesap Silme</a></li></ul></div>'
      + '<div class="telif">© ' + new Date().getFullYear() + ' Ringo · ringolounge.com · Tüm hakları saklıdır.</div></div>';
    document.body.appendChild(f);
  }
  function belir() {
    var els = document.querySelectorAll('.belir');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('gor'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('gor'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  // Canlı durum (api/kurumsal/durum)
  window.RingoDurum = function (cb) {
    fetch(API + '/api/kurumsal/durum', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) { cb(d && d.ok ? d : null); }).catch(function () { cb(null); });
  };
  window.RingoSistemOk = function (d) {
    if (!d) return null;
    var s = d.sistem; return !!(s && s.api.ok && s.veritabani.ok && s.gercek_zamanli.ok);
  };
  function doldur(d) {
    document.querySelectorAll('[data-sayi]').forEach(function (el) {
      var k = el.getAttribute('data-sayi').split('.'), v = d; k.forEach(function (x) { v = v && v[x]; });
      if (v != null) el.textContent = v;
    });
    var ok = window.RingoSistemOk(d);
    document.querySelectorAll('[data-sistem]').forEach(function (el) {
      var n = el.querySelector('.nabiz'), y = el.querySelector('[data-sistem-yazi]');
      if (n) n.className = 'nabiz ' + (ok === null ? '' : ok ? 'ok' : 'sorun');
      if (y) y.textContent = ok === null ? 'Durum alınamadı' : ok ? 'Tüm sistemler çalışıyor' : 'Kısmi kesinti';
    });
    document.querySelectorAll('[data-topluluk]').forEach(function (el) { el.hidden = !(d && d.topluluk); });
  }

  // İletişim formu
  function form() {
    var f = document.getElementById('iletisimFormu'); if (!f) return;
    var q = new URLSearchParams(location.search).get('konu'); if (q && f.konu.querySelector('option[value="' + q + '"]')) f.konu.value = q;
    var sonuc = f.querySelector('.sonuc'), dugme = f.querySelector('button');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var veri = { konu: f.konu.value, ad: f.ad.value, eposta: f.eposta.value, kurum: f.kurum.value, mesaj: f.mesaj.value, web: f.web.value, sayfa: location.href };
      dugme.disabled = true; sonuc.className = 'sonuc'; sonuc.textContent = 'Gönderiliyor…';
      fetch(API + '/api/kurumsal/iletisim', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(veri) })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: r.status === 429 ? 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.' : 'Gönderilemedi.' }; }); })
        .then(function (d) {
          if (d && d.ok) { f.reset(); sonuc.className = 'sonuc ok'; sonuc.textContent = 'Teşekkürler! Mesajınız bize ulaştı, en kısa sürede dönüş yapacağız.'; }
          else { sonuc.className = 'sonuc hata'; sonuc.textContent = (d && d.error) || 'Gönderilemedi. Lütfen tekrar deneyin.'; }
        })
        .catch(function () { sonuc.className = 'sonuc hata'; sonuc.textContent = 'Bağlantı hatası. Lütfen tekrar deneyin.'; })
        .then(function () { dugme.disabled = false; });
    });
  }

  ust(); alt(); belir(); form();
  if (document.querySelector('[data-sayi],[data-sistem]')) window.RingoDurum(doldur);
})();
