// /api/login.js
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

export const config = { api: { bodyParser: false } }; // kita parse sendiri

async function parseAny(req) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (req.method === "GET") return { ...req.query };

  let raw = "";
  for await (const c of req) raw += c;

  // JSON
  if (ct.includes("application/json") || raw.trim().startsWith("{")) {
    try { return JSON.parse(raw || "{}"); } catch {}
  }
  // x-www-form-urlencoded
  if (ct.includes("application/x-www-form-urlencoded") || raw.includes("=")) {
    try { return Object.fromEntries(new URLSearchParams(raw)); } catch {}
  }
  return {};
}

function pick(obj, keys) {
  const m = {}; for (const k of Object.keys(obj || {})) m[k.toLowerCase()] = obj[k];
  for (const k of keys) if (m[k] != null && m[k] !== "") return String(m[k]);
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  const p = await parseAny(req);

  // 1) MODE TOKEN (APK kamu mengirim ini)
  const token = pick(p, ["token", "auth", "t"]);
  if (token) {
    // Opsional: decode untuk logging ringan (jangan lempar sensitif)
    // const outer = JSON.parse(Buffer.from(token, "base64").toString("utf8")); // bisa gagal kalau bukan JSON
    // Di sini kita anggap token valid dan langsung balas sukses.
    return res.status(200).json({
      Cliente: "token",
      Dias: 365,       // bebas kamu atur
      Note: "OK (token mode)"
    });
  }

  // 2) MODE USER/PASS (fallback kalau APK lain kirim kredensial)
  const username = pick(p, ["username","user","usr","u","email","uid","login","account"]);
  const password = pick(p, ["password","pass","pwd","pw","p"]);

  if (!username || !password) {
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
