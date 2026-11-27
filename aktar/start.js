import { db } from 'hatchable';
import crypto from 'node:crypto';
import { gameConfig, SESSION_TTL_MIN } from '../../lib/skill-games.js';
import { guard } from '../../lib/ringo-guard.js';

// Beceri oyunu başlat: ücretsiz oyun oturumu açar (giriş puanı yok).
// POST { game: 'meyve-kes', mode: 'classic'|'arcade' }
export const access = 'user';
export const methods = ['POST'];

function cleanName(v) {
  return String(v || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
}

export default async function (req, res) {
  if (!guard(req, res, 'skill-games/start')) return; // kişi başı istek sınırı (Play madde 4)
  const uid = String(req.user.id);
  const body = req.body || {};
  const cfg = gameConfig(body.game, body.mode);
  if (!cfg) return res.status(400).json({ ok: false, error: 'Geçersiz oyun veya mod.' });

  try {
    let name = '';
    try {
      const p = await db.query('SELECT display_name FROM ringo_profiles WHERE user_id=$1 LIMIT 1', [uid]);
      name = cleanName(p.rows[0]?.display_name);
    } catch (_) {}
    name = name || cleanName(req.user.name) || cleanName(req.user.email && String(req.user.email).split('@')[0]) || 'Ringo Oyuncusu';

    // Yarım kalmış eski oyunlar kapanır.
    await db.query(`UPDATE ringo_skill_sessions SET status='expired', finished_at=now(), reject_reason='abandoned'
                    WHERE user_id=$1 AND status='active'`, [uid]);
    const sessionId = crypto.randomUUID();
    await db.query(`INSERT INTO ringo_skill_sessions (id, user_id, display_name, game, mode, bet) VALUES ($1::uuid, $2, $3, $4, $5, 0)`,
      [sessionId, uid, name, cfg.game, cfg.mode]);
    return res.json({ ok: true, session_id: sessionId, ttl_minutes: SESSION_TTL_MIN });
  } catch (error) {
    console.error('Skill game start failed:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Oyun şu anda başlatılamıyor.' });
  }
}
