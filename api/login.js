import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { username, password, device_id } = req.body;

  if (!username || !password || !device_id) {
    return res.status(400).json({ error: "Semua field wajib diisi!" });
  }

  try {
    const filePath = path.join(process.cwd(), "data", "users.json");
    const jsonData = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(jsonData);

    const user = users.find((u) => u.username === username);
    if (!user) {
      return res.status(401).json({ error: "Username atau password salah!" });
    }

    // Cek password
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Username atau password salah!" });
    }

    // Cek expired
    const now = new Date();
    const exp = new Date(user.expired_at);
    if (now > exp) {
      return res.status(403).json({ error: "Akun sudah expired!" });
    }

    // Cek device
    if (!Array.isArray(user.devices)) user.devices = [];
    if (!user.devices.includes(device_id)) {
      if (user.devices.length >= user.device_limit) {
        return res.status(403).json({ error: "Device limit penuh!" });
      }
      user.devices.push(device_id);
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
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
