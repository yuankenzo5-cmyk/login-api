import express from "express";
import bcrypt from "bcryptjs";
import { openDb, initDb } from "./db.js";

const app = express();
app.use(express.json());

app.post("/api/login", async (req, res) => {
  await initDb();
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
    return res.json({ Cliente: username, Dias: daysLeft });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
