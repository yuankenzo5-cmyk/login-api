import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

// matikan bodyParser bawaan → kita parse sendiri agar fleksibel
export const config = { api: { bodyParser: false } };

async function parseAny(req) {
  const ct = (req.headers["content-type"] || "").toLowerCase();

  if (req.method === "GET") {
    return { ...req.query, _ct: ct, _raw: "" };
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;

  let params = {};
  if (ct.includes("application/json")) {
    try { params = JSON.parse(raw || "{}"); } catch {}
  } else if (ct.includes("application/x-www-form-urlencoded")) {
    params = Object.fromEntries(new URLSearchParams(raw));
  } else {
    // fallback: coba keduanya
    try { params = JSON.parse(raw || "{}"); }
    catch { try { params = Object.fromEntries(new URLSearchParams(raw)); } catch {} }
  }
  return { ...params, _ct: ct, _raw: raw };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const p = await parseAny(req);

  // alias nama field umum
  const app_Us = p.app_Us || p.user || p.email || p.uid;
  const app_Pa = p.app_Pa || p.pass || p.pwd || p.pw;

  if (!app_Us || !app_Pa) {
    return res.status(400).json({ error: "Semua field wajib diisi!" });
  }

  try {
    const filePath = path.join(process.cwd(), "data", "users.json");
    const users = JSON.parse(await fs.readFile(filePath, "utf8"));

    const user = users.find((u) => u.app_Us === app_Us);
    if (!user) return res.status(401).json({ error: "Username atau password salah!" });

    const ok = bcrypt.compareSync(app_Pa, user.app_Pa);
    if (!ok) return res.status(401).json({ error: "Username atau password salah!" });

    const now = new Date();
    const exp = new Date(user.expired_at);
    if (now > exp) return res.status(403).json({ error: "Akun sudah expired!" });

    const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));

    return res.status(200).json({
      Cliente: app_Us,
      Dias: daysLeft,
      Note: "OK"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
  }
