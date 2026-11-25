import { db } from 'hatchable';
import { sayacEkle } from '../../lib/sayac.js';
import { arcadeConfig, RUN_TTL_MIN } from '../../lib/arcade.js';
import { guard } from '../../lib/ringo-guard.js';
import { sekerOdul } from '../../lib/seker-odul.js';

// Rekor oyununu bitir: skoru sunucu yeniden hesaplar. Ödül yalnız Ringo Şeker bölümünde profil XP'si (lib/seker-odul.js). POST { run_id, ...sonuç }
export const access = 'user';
export const methods = ['POST'];

export default async function (req, res) {
  if (!guard(req, res, 'arcade/finish')) return; // kişi başı istek sınırı (Play madde 4)
  const uid = String(req.user.id);
  const b = req.body || {};
  const id = String(b.run_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ ok: false, error: 'Geçersiz oyun kaydı.' });
  try {
    const r = (await db.query(`SELECT game, mode, status, extract(epoch FROM (now() - started_at))::float AS sec
      FROM ringo_arcade_runs WHERE id=$1 AND user_id=$2`, [id, uid])).rows[0];
    if (!r) return res.status(404).json({ ok: false, error: 'Oyun kaydı bulunamadı.' });
    if (r.status !== 'active') return res.status(409).json({ ok: false, error: 'Bu oyun zaten kapanmış.' });
    const cfg = arcadeConfig(r.game, r.mode);
    const sec = Number(r.sec);
    let [reason, score, meta] = sec > (cfg.g.ttlMin || RUN_TTL_MIN) * 60 ? ['timeout', 0] : cfg.g.check(b, sec, { id, mode: r.mode });
    const status = reason ? (reason === 'timeout' ? 'expired' : 'rejected') : 'finished';
    const prev = await db.query("SELECT COALESCE(MAX(score),0)::int AS best FROM ringo_arcade_runs WHERE user_id=$1 AND game=$2 AND mode=$3 AND status='finished'", [uid, r.game, r.mode]);
    const u = await db.query(`UPDATE ringo_arcade_runs SET status=$3, score=$4, meta=$5::jsonb, reject_reason=$6, finished_at=now()
      WHERE id=$1 AND user_id=$2 AND status='active' RETURNING id`, [id, uid, status, status === 'finished' ? score : 0, JSON.stringify(meta || {}), reason]);
    if (!u.rows[0]) return res.status(409).json({ ok: false, error: 'Bu oyun zaten kapanmış.' });
    let weekRank = null;
    if (status === 'finished' && score > 0) {
      await sayacEkle({ uid, code: 'tek_oyun', ref: 'arcade:' + id }); // etkinlik sayacı
      const q = await db.query(`WITH best AS (SELECT user_id, MAX(score) AS score FROM ringo_arcade_runs
          WHERE game=$1 AND mode=$2 AND status='finished' AND score > 0
            AND finished_at >= date_trunc('week', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul' GROUP BY user_id)
        SELECT 1 + COUNT(*) AS rank FROM best WHERE score > (SELECT score FROM best WHERE user_id=$3)`, [r.game, r.mode, uid]);
      weekRank = q.rows[0] ? Number(q.rows[0].rank) : null;
    }
    let xp = 0;
    if (status === 'finished' && r.game === 'seker' && meta && meta.won) xp = await sekerOdul(uid, meta).catch(() => 0);
    const best = Number(prev.rows[0].best);
    return res.json({ ok: true, status, reason, score: status === 'finished' ? score : 0, best: Math.max(best, status === 'finished' ? score : 0), record: status === 'finished' && score > best, week_rank: weekRank, xp });
  } catch (error) {
    console.error('arcade_finish', error?.message || error);
    return res.status(500).json({ ok: false, error: 'Sonuç kaydedilemedi.' });
  }
}
