-- Ringo Şeker bölüm ödülü: profil XP'si (sebep 'seker'; miktar lib/seker-odul.js). Oyundan Ringo Puanı yok kuralı korunur.
ALTER TABLE ringo_rank_xp_ledger DROP CONSTRAINT IF EXISTS ringo_rank_xp_ledger_reason_check;
ALTER TABLE ringo_rank_xp_ledger ADD CONSTRAINT ringo_rank_xp_ledger_reason_check
  CHECK (reason IN ('discover_comment', 'discover_like_received', 'daily_active', 'party_win', 'gorev', 'seker'));
