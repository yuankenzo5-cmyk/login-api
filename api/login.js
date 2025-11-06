// /api/login.js (mode proxy)
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const TARGET = "https://brmods.net/mod/loginMod.php?gdfasdgertdfswsdf=v1"; // ganti sesuai oldhostmu
  try {
    let body = null;
    if (req.method !== "GET") {
      const chunks = []; for await (const c of req) chunks.push(c);
      body = Buffer.concat(chunks);
    }
    const url = new URL(TARGET);
    // kalau aslinya GET + query, gabungkan:
    if (req.method === "GET") {
      const q = new URL(req.url, "https://x").search; // query dari klien
      if (q) url.search = (url.search ? url.search + "&" : "?") + q.slice(1);
    }
    const up = await fetch(url, {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "Accept-Encoding": "identity",
        "Content-Type": req.headers["content-type"] || "application/x-www-form-urlencoded",
      },
      body: req.method === "GET" ? undefined : body
    });
    const text = await up.text();
    res.status(up.status).setHeader("Content-Type", up.headers.get("content-type") || "text/plain").send(text);
  } catch (e) {
    res.status(500).send("ERR: " + e.message);
  }
  }
