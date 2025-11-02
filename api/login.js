import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { username, password, device_id } = req.body;

  if (!username || !password || !device_id) {
    return res.status(400).json({ error: "Semua field wajib diisi!" });
  }

  try {
    // Baca file JSON statis
    const filePath = path.join(process.cwd(), "data", "users.json");
    const users = JSON.parse(fs.readFileSync(filePath, "utf8"));

    const user = users.find((u) => u.username === username);
    if (!user) {
      return res.status(401).json({ error: "Username atau password salah!" });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Username atau password salah!" });
    }

    const now = new Date();
    const exp = new Date(user.expired_at);
    if (now > exp) {
      return res.status(403).json({ error: "Akun sudah expired!" });
    }

    const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));

    // Tidak update device_id karena file tidak bisa ditulis di Vercel
    return res.status(200).json({
      Cliente: username,
      Dias: daysLeft,
      Note: "Device check disabled di versi Vercel"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
                                }
