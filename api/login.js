// /api/login.js  (Next.js pages API / Node on Vercel)
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

export const config = { api: { bodyParser: false } }; // biar kita parse sendiri

async function parseAny(req) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (req.method === "GET") return { ...req.query, _ct: ct, _raw: "" };

  // kumpulkan body mentah
  let raw = "";
  for await (const c of req) raw += c;

  // 1) JSON
  if (ct.includes("application/json")) {
    try { return { ...(JSON.parse(raw || "{}")), _ct: ct, _raw: raw }; } catch {}
  }
  // 2) x-www-form-urlencoded
  if (ct.includes("application/x-www-form-urlencoded")) {
    return { ...Object.fromEntries(new URLSearchParams(raw)), _ct: ct, _raw: raw };
  }
  // 3) text/plain / unknown → coba keduanya
  try { return { ...(JSON.parse(raw || "{}")), _ct: ct, _raw: raw }; } catch {}
  try { return { ...Object.fromEntries(new URLSearchParams(raw)), _ct: ct, _raw: raw }; } catch {}

  return { _ct: ct, _raw: raw }; // kosong jika gagal
}

function pick(params, aliases) {
  const map = {};
  for (const k of Object.keys(params || {})) map[k.toLowerCase()] = params[k];
  for (const key of aliases) if (map[key] != null && map[key] !== "") return String(map[key]);
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  const p = await parseAny(req);

  // alias sangat longgar
  const username = pick(p, ["username","user","usr","u","email","uid","login","account"]);
  const password = pick(p, ["password","pass","pwd","pw","p"]);

  if (!username || !password) {
    // log agar kamu bisa lihat apa yg APK kirim di Function Logs
    console.log("[login] BAD FIELDS", { headers: req.headers, parsed: p });
    return res.status(400).json({ error: "Semua field wajib diisi!" });
  }

  try {
    const filePath = path.join(process.cwd(), "data", "users.json");
    const users = JSON.parse(await fs.readFile(filePath, "utf8"));

    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: "Username atau password salah!" });

    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: "Username atau password salah!" });

    const now = new Date();
    const exp = new Date(user.expired_at);
    if (now > exp) return res.status(403).json({ error: "Akun sudah expired!" });

    const daysLeft = Math.floor((exp - now) / (1000*60*60*24));
    return res.status(200).json({ Cliente: username, Dias: daysLeft, Note: "OK" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error: " + e.message });
  }
}
