import { openDb, initDb } from "../db.js"; // sesuaikan path-nya kalau perlu
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  await initDb();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { username, password, device_id } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi!" });
  }

  try {
    const db = await openDb();
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Username atau password salah!" });
    }

    const now = new Date();
    const exp = new Date(user.expired_at);
    if (now > exp) {
      return res.status(403).json({ error: "Akun sudah expired!" });
    }

    let devices = JSON.parse(user.devices || "[]");
    if (!devices.includes(device_id)) {
      if (devices.length >= user.device_limit) {
        return res.status(403).json({ error: "Device limit penuh!" });
      }
      devices.push(device_id);
      await db.run("UPDATE users SET devices = ? WHERE id = ?", [
        JSON.stringify(devices),
        user.id
      ]);
    }

    const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
    return res.status(200).json({
      Cliente: username,
      Dias: daysLeft
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
