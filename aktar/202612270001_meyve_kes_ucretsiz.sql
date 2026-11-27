-- Meyve Kes ücretsiz: giriş puanı ve katlamalı ödül kaldırıldı (bahis çağrışımı). Yeni oturumlar bet=0.
-- Ödül yalnız profil XP'si (sebep 'meyve'; lib/skill-games.js XP_BASAMAK, günde en çok 20).
ALTER TABLE ringo_skill_sessions DROP CONSTRAINT IF EXISTS ringo_skill_sessions_bet_check;
ALTER TABLE ringo_skill_sessions ADD CONSTRAINT ringo_skill_sessions_bet_check CHECK (bet IN (0, 10, 25, 50, 100));
ALTER TABLE ringo_rank_xp_ledger DROP CONSTRAINT IF EXISTS ringo_rank_xp_ledger_reason_check;
ALTER TABLE ringo_rank_xp_ledger ADD CONSTRAINT ringo_rank_xp_ledger_reason_check
  CHECK (reason IN ('discover_comment', 'discover_like_received', 'daily_active', 'party_win', 'gorev', 'seker', 'meyve'));
