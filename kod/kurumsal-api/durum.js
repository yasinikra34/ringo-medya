import { db } from 'hatchable';
import { guard } from '../../lib/ringo-guard.js';
import { RT_URL, rtCall } from '../../lib/ringo-rt.js';
import { OYUNLAR, SAYAC_AYARI, cors } from '../../lib/kurumsal.js';

// Kurumsal site: canlı sistem durumu + platform göstergeleri (herkese açık, kişisel veri yok).
// sistem: API (bu uç), veritabanı, gerçek zamanlı sunucu (Cloudflare), Bekçi'nin son bakım raporu.
// topluluk: yalnız ringo_site_settings 'kurumsal_sayac' = true ise döner (lib/kurumsal.js).
export const access = 'public';
export const methods = ['GET'];

async function olc(fn) {
  const t = Date.now();
  try { const v = await fn(); return { ok: v !== false, ms: Date.now() - t }; }
  catch (_) { return { ok: false, ms: Date.now() - t }; }
}

export default async function (req, res) {
  cors(req, res);
  if (!guard(req, res, 'kurumsal-durum', { n: 20, toplam: false })) return;
  const t0 = Date.now();

  const [vt, rt, bekci, sayilar, ayar] = await Promise.all([
    olc(() => db.query('SELECT 1')),
    olc(async () => {
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 4000);
      try { const r = await fetch(RT_URL + '/health', { signal: ac.signal }); return r.ok; } finally { clearTimeout(to); }
    }),
    rtCall('/internal/bekci', { act: 'durum' }, 1, 3000).catch(() => null),
    db.query(`SELECT
      (SELECT count(*)::int FROM ringo_gift_catalog WHERE status = 'active') AS hediye,
      (SELECT count(*)::int FROM ringo_agencies WHERE status = 'active') AS ajans,
      (SELECT count(*)::int FROM ringo_rooms WHERE status = 'active') AS oda`).then(r => r.rows[0]).catch(() => ({})),
    db.query('SELECT value FROM ringo_site_settings WHERE key = $1', [SAYAC_AYARI]).then(r => r.rows[0]?.value === true).catch(() => false)
  ]);

  let topluluk = null;
  if (ayar) {
    try {
      const r = await db.query(`SELECT
        (SELECT count(*)::int FROM ringo_profiles) AS uye,
        (SELECT count(*)::int FROM ringo_user_presence WHERE last_seen_at > now() - interval '5 minutes') AS cevrimici`);
      topluluk = r.rows[0];
    } catch (_) {}
  }

  const b = bekci && bekci.ok && bekci.body ? bekci.body : null;
  try { res.setHeader('Cache-Control', 'public, max-age=30'); } catch (_) {}
  return res.json({
    ok: true,
    zaman: new Date().toISOString(),
    sistem: {
      api: { ok: true, ms: Date.now() - t0 },
      veritabani: vt,
      gercek_zamanli: rt,
      bekci: { ok: !!b, son_kontrol: b ? b.son_rapor : null, acik_sorun: b ? b.acik_sorun : null }
    },
    platform: { oyun: OYUNLAR.length, oyunlar: OYUNLAR, hediye: sayilar.hediye ?? null, ajans: sayilar.ajans ?? null, oda: sayilar.oda ?? null },
    topluluk
  });
}
