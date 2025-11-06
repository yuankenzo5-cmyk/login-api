// /api/login.js
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

// --- parser fleksibel -------------------------------------------------------
async function parseAny(req) {
  const ct = (req.headers["content-type"] || "").toLowerCase();

  if (req.method === "GET") {
    return { params: { ...req.query }, ct, raw: "" };
  }

  let raw = "";
  for await (const c of req) raw += c;

  // 1) JSON
  if (ct.includes("application/json") || raw.trim().startsWith("{")) {
    try { return { params: JSON.parse(raw || "{}"), ct, raw }; } catch {}
  }
  // 2) x-www-form-urlencoded
  if (ct.includes("application/x-www-form-urlencoded") || raw.includes("=")) {
    try { return { params: Object.fromEntries(new URLSearchParams(raw)), ct, raw }; } catch {}
  }
  // 3) fallback kosong
  return { params: {}, ct, raw };
}

function pick(params, aliases) {
  const map = {};
  for (const k of Object.keys(params || {})) map[k.toLowerCase()] = params[k];
  for (const key of aliases) if (map[key] != null && map[key] !== "") return String(map[key]);
  return "";
}

// --- handler ----------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { params, ct, raw } = await parseAny(req);

  const username = pick(params, ["username","user","usr","u","email","uid","login","account"]);
  const password = pick(params, ["password","pass","pwd","pw","p"]);

  // DEBUG MODE: kalau belum ketemu field, balas 200 dan tampilkan apa yang diterima
  if (!username || !password) {
    return res.status(200).json({
      debug: true,
      note: "Field belum ditemukan. Kirimkan respons ini ke saya—akan saya mappingkan.",
      seen: {
        method: req.method,
        contentType: ct,
        keys: Object.keys(params || []),
        params,
        raw // mungkin panjang; ini yang paling penting
      }
    });
  }

  // ====== NORMAL FLOW (sama seperti sebelumnya, tanpa device_id) ======
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
