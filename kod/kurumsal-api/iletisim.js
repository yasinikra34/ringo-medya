import { db, email } from 'hatchable';
import { yazmaSiniri } from '../../lib/ringo-guard.js';
import { RINGO_OWNER_USER_ID } from '../../lib/ringo-admin-auth.js';
import { cors } from '../../lib/kurumsal.js';

// Kurumsal site iletişim / iş birliği formu. Herkese açık POST.
// Gövde text/plain (JSON metni) gelir: tarayıcı başka adresten (kurumsal.ringolounge.com) ön kontrol isteği atmasın.
// Koruma: gizli "web" alanı dolu ise sessizce kabul edip atılır; aynı kişiden saatte 3 gönderim.
// Kayıt: ringo_kurumsal_iletisim + sahibe Ringo içi bildirim + e-posta (gönderilemezse kayıt yine kalır).
export const access = 'public';
export const methods = ['POST'];

const KONULAR = { genel: 'Genel bilgi', is: 'İş birliği', yatirim: 'Yatırım', basin: 'Basın', destek: 'Kullanıcı desteği' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const temiz = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);

export default async function (req, res) {
  cors(req, res);
  let g = req.body;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch (_) { g = {}; } }
  g = g && typeof g === 'object' ? g : {};

  if (temiz(g.web, 200)) return res.json({ ok: true }); // bot tuzağı
  if (!(await yazmaSiniri(req, res, 'kurumsal-iletisim', 3, 3600000))) return;

  const konu = KONULAR[g.konu] ? g.konu : 'genel';
  const ad = temiz(g.ad, 80), eposta = temiz(g.eposta, 160).toLowerCase(), kurum = temiz(g.kurum, 120), mesaj = temiz(g.mesaj, 3000);
  const sayfa = temiz(g.sayfa, 200);
  if (ad.length < 2) return res.status(400).json({ ok: false, error: 'Lütfen adınızı yazın.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) return res.status(400).json({ ok: false, error: 'E-posta adresi geçersiz.' });
  if (mesaj.length < 10) return res.status(400).json({ ok: false, error: 'Mesajınız en az 10 karakter olmalı.' });

  await db.query('INSERT INTO ringo_kurumsal_iletisim (konu, ad, eposta, kurum, mesaj, sayfa) VALUES ($1,$2,$3,$4,$5,$6)',
    [konu, ad, eposta, kurum || null, mesaj, sayfa || null]);

  const baslik = `Kurumsal site: ${KONULAR[konu]} — ${ad}`;
  const metin = `${ad} <${eposta}>${kurum ? ' · ' + kurum : ''}\nKonu: ${KONULAR[konu]}\n\n${mesaj}`;
  try {
    await db.query(`INSERT INTO ringo_notifications (user_id, kind, title, body, data) VALUES ($1, 'kurumsal_iletisim', $2, $3, $4::jsonb)`,
      [RINGO_OWNER_USER_ID, baslik.slice(0, 120), metin.slice(0, 500), JSON.stringify({ eposta, konu })]);
  } catch (e) { console.error('kurumsal bildirim', e?.message || e); }
  try {
    const u = await db.query('SELECT email FROM users WHERE id = $1', [RINGO_OWNER_USER_ID]);
    const to = u.rows[0]?.email;
    if (to) await email.send({
      to, subject: baslik.slice(0, 150), text: metin + '\n\nYanıtlamak için: ' + eposta,
      html: `<p><b>${esc(ad)}</b> &lt;<a href="mailto:${esc(eposta)}">${esc(eposta)}</a>&gt;${kurum ? ' · ' + esc(kurum) : ''}</p>`
        + `<p>Konu: ${esc(KONULAR[konu])}</p><p style="white-space:pre-wrap">${esc(mesaj)}</p>`
    });
  } catch (e) { console.error('kurumsal eposta', e?.message || e); }

  return res.json({ ok: true });
}
