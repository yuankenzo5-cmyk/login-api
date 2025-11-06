import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

// Matikan bodyParser bawaan supaya kita bisa parse format apa pun
export const config = { api: { bodyParser: false } };

async function parseAny(req) {
  const ct = (req.headers["content-type"] || "").toLowerCase();

  // GET → pakai query
  if (req.method === "GET") {
    return { ...req.query, _ct: ct, _raw: "" };
  }

  // Kumpulkan body mentah
  let raw = "";
  for await (const chunk of req) raw += chunk;

  let params = {};
  if (ct.includes("application/json")) {
    try { params = JSON.parse(raw || "{}"); } catch {}
  } else if (ct.includes("application/x-www-form-urlencoded")) {
    params = Object.fromEntries(new URLSearchParams(raw));
  } else {
    // fallback: coba kedua-duanya
    try { params = JSON.parse(raw || "{}"); } catch {
      try { params = Object.fromEntries(new URLSearchParams(raw)); } catch {}
    }
  }
  return { ...params, _ct: ct, _raw: raw };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Ambil parameter dari format apa pun
  const p = await parseAny(req);

  // Alias nama field umum
  const username = p.username || p.user || p.email || p.uid;
  const password = p.password || p.pass || p.pwd || p.pw;
  const deviceId = p.device_id || p.device || p.imei || p.did;

  // --- validasi basic ---
  if (!username || !password || !deviceId) {
    return res.status(400).json({ error: "Semua field wajib diisi!" });
  }

  try {
    // Baca file user (read-only di Vercel aman)
    const filePath = path.join(process.cwd(), "data", "users.json");
    const file = await fs.readFile(filePath, "utf8");
    const users = JSON.parse(file);

    const user = users.find((u) => u.username === username);
    if (!user) return res.status(401).json({ error: "Username atau password salah!" });

    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ error: "Username atau password salah!" });

    const now = new Date();
    const exp = new Date(user.expired_at);
    if (now > exp) return res.status(403).json({ error: "Akun sudah expired!" });

    const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));

    // NOTE: tidak update deviceId karena filesystem Vercel read-only
    return res.status(200).json({
      Cliente: username,
      Dias: daysLeft,
      Note: "OK (device check disabled on Vercel)"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
    }
