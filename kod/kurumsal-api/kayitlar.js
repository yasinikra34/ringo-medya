import { requireRingoOwner } from '../../lib/ringo-admin-auth.js';
import { rtCall } from '../../lib/ringo-rt.js';

// Kurumsal site formundan gelen mesajlar + "Haber ver" bekleme listesi (yalnız Ringo sahibi).
// Kayıtlar Cloudflare'deki kurumsal kutuda ("kurumsal:ana", workers/ringo-realtime/src/kurumsal.js) durur;
// uygulama özel/kapalıyken de form çalışsın diye. Sayfa: /kurumsal-mesajlar.html
export const access = 'user';
export const methods = ['GET'];

export default async function (req, res) {
  const ctx = await requireRingoOwner(req, res);
  if (!ctx) return;
  const r = await rtCall('/internal/kurumsal', { act: 'liste', n: 200 }, 2, 6000);
  if (!r.ok || !r.body || !r.body.ok) return res.status(502).json({ ok: false, error: 'Kayıtlar alınamadı (gerçek zamanlı sunucu).' });
  return res.json(r.body);
}
