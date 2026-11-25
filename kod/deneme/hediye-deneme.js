import { db } from 'hatchable';
import { requireRingoOwner } from 'lib/ringo-admin-auth.js';

// Hediye deneme sayfası (/hediye-deneme.html): yalnız Ringo sahibi. Etkin hediye kataloğunu döner; sayfa efekti
// yalnız sahibin kendi ekranında oynatır — gönderim, jeton düşümü, PK puanı ya da kayıt yok.
export const access = 'user';
export const methods = ['GET'];

export default async function (req, res) {
  const ctx = await requireRingoOwner(req, res);
  if (!ctx) return;
  const q = await db.query(`SELECT code, name, unit_price, asset_key, effect FROM ringo_gift_catalog
    WHERE status = 'active' ORDER BY sort_order, name LIMIT 200`);
  return res.json({ ok: true, gifts: q.rows });
}
