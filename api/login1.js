// api/login.js
export default async function handler(req, res) {
  const ct = (req.headers['content-type'] || '').toLowerCase();

  // --- ambil body mentah ---
  let raw = '';
  if (req.method !== 'GET') {
    raw = await new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data));
    });
  }

  // --- log ke Vercel (cek di Function Logs) ---
  console.log('[login] method=', req.method);
  console.log('[login] headers=', req.headers);
  console.log('[login] query=', req.query);
  console.log('[login] raw=', raw);

  // --- parsing fleksibel ---
  let params = {};
  if (req.method === 'GET') {
    params = req.query;
  } else if (ct.includes('application/json')) {
    try { params = JSON.parse(raw || '{}'); } catch { params = {}; }
  } else if (ct.includes('application/x-www-form-urlencoded')) {
    params = Object.fromEntries(new URLSearchParams(raw));
  } else {
    // fallback: coba treat sebagai urlencoded juga
    try { params = Object.fromEntries(new URLSearchParams(raw)); } catch { params = {}; }
  }

  // --- alias kemungkinan nama field ---
  const user = params.username || params.user || params.email || params.uid;
  const pass = params.password || params.pass || params.pw || params.pwd;

  // --- MODE KOMPATIBEL (sementara): tetap 200 meski field belum ada ---
  if (!user || !pass) {
    return res.status(200).json({
      status: 'ok',
      note: 'compat-mode: field belum lengkap',
      seen: { method: req.method, ct, query: req.query, params, raw }
    });
  }

  // TODO: di sini letakkan logic aslinya (cek ke DB, dll.)
  return res.status(200).json({ status: 'ok', user });
                            }
