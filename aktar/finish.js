import { db } from 'hatchable';
import { sayacEkle } from '../../lib/sayac.js';
import { gameConfig, validateResult, basamak, XP_BASAMAK, SESSION_TTL_MIN } from '../../lib/skill-games.js';
import { awardRankXp } from '../../lib/ringo-rank-xp.js';
import { guard } from '../../lib/ringo-guard.js';

// Beceri oyunu bitir: skoru doğrular, sıralamaya yazar. Ringo Puanı verilmez (ücretsiz oyun).
// Ödül: geçilen her skor basamağı için günde bir kez +5 XP (iki modda ortak; günde en çok 20 XP).
// POST { session_id, score, fruits, best_combo }
export const access = 'user';
export const methods = ['POST'];

const gun = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); // YYYY-AA-GG

export default async function (req, res) {
  if (!guard(req, res, 'skill-games/finish')) return; // kişi başı istek sınırı (Play madde 4)
  const uid = String(req.user.id);
  const b = req.body || {};
  const sid = String(b.session_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(sid)) return res.status(400).json({ ok: false, error: 'Geçersiz oyun kaydı.' });
  const score = Number(b.score), fruits = Number(b.fruits), bestCombo = Number(b.best_combo || 0);

  try {
    const s = (await db.query(`SELECT id, game, mode, status, extract(epoch FROM (now() - started_at))::float AS elapsed
                               FROM ringo_skill_sessions WHERE id=$1 AND user_id=$2`, [sid, uid])).rows[0];
    if (!s) return res.status(404).json({ ok: false, error: 'Oyun kaydı bulunamadı.' });
    if (s.status !== 'active') return res.status(409).json({ ok: false, error: 'Bu oyun zaten kapanmış.' });
    const cfg = gameConfig(s.game, s.mode);
    const elapsedSec = Number(s.elapsed);

    let status = 'finished', reason = null;
    if (elapsedSec > SESSION_TTL_MIN * 60) { status = 'expired'; reason = 'timeout'; }
    else {
      reason = validateResult(cfg, { score, fruits, bestCombo, elapsedSec });
      if (reason) status = 'rejected';
    }
    const u = await db.query(`UPDATE ringo_skill_sessions SET status=$3, score=$4, fruits=$5, best_combo=$6, reward=0, reject_reason=$7, finished_at=now()
      WHERE id=$1 AND user_id=$2 AND status='active' RETURNING id`,
      [sid, uid, status, Number.isSafeInteger(score) ? Math.max(0, Math.min(score, 100000)) : 0,
       Number.isSafeInteger(fruits) ? fruits : 0, Number.isSafeInteger(bestCombo) ? bestCombo : 0, reason]);
    if (!u.rows[0]) return res.status(409).json({ ok: false, error: 'Bu oyun zaten kapanmış.' });

    let weekRank = null, xp = 0;
    const kademe = status === 'finished' ? basamak(cfg, score) : 0;
    if (status === 'finished' && score > 0) {
      await sayacEkle({ uid, code: 'tek_oyun', ref: 'beceri:' + sid }); // etkinlik sayacı
      const d = gun();
      for (let k = 1; k <= kademe; k++) { // aynı gün aynı basamak tekrar XP vermez (defter tekil)
        try { const r = await awardRankXp(uid, 'meyve', 'meyve:' + d + ':' + k, XP_BASAMAK); if (r && r.ok) xp += Number(r.delta || 0); } catch (_) {}
      }
      const r = await db.query(`
        WITH best AS (
          SELECT user_id, MAX(score) AS score FROM ringo_skill_sessions
          WHERE game=$1 AND mode=$2 AND status='finished' AND score > 0
            AND finished_at >= date_trunc('week', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul'
          GROUP BY user_id)
        SELECT 1 + COUNT(*) AS rank FROM best WHERE score > (SELECT score FROM best WHERE user_id=$3)`, [s.game, s.mode, uid]);
      weekRank = r.rows[0] ? Number(r.rows[0].rank) : null;
    }
    return res.json({
      ok: true, status,
      reason: status === 'finished' ? null : reason,
      score: Number.isSafeInteger(score) ? score : 0,
      xp, kademe, kademe_max: cfg.m.xp.length,
      week_rank: weekRank
    });
  } catch (error) {
    console.error('Skill game finish failed:', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Sonuç kaydedilemedi.' });
  }
}
