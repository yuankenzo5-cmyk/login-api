import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  // Izinkan CORS (opsional)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Pastikan request body diterima
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ Status: "Failed", Message: "Invalid JSON" });
    }
  }

  const username = body.username || body.user || "";
  const password = body.password || body.pass || "";

  if (!username || !password) {
    return res.status(400).json({
      Status: "Failed",
      Message: "Missing credentials",
    });
  }

  // Cek login sederhana
  const validUser = "brmod";
  const validPass = "123";

  if (username !== validUser || password !== validPass) {
    return res.status(401).json({
      Status: "Failed",
      Message: "Invalid login",
    });
  }

  // Path ke loader.zip
  const filePath = path.join(process.cwd(), "public", "loader.zip");

  if (!fs.existsSync(filePath)) {
    return res.status(500).json({
      Status: "Failed",
      Message: "loader.zip not found",
    });
  }

  // Baca dan ubah jadi base64
  const fileBuffer = fs.readFileSync(filePath);
  const loaderBase64 = fileBuffer.toString("base64");

  // Format JSON hasil
  const result = {
    Status: "Success",
    Loader: loaderBase64,
    MessageString: {
      Cliente: username,
      Dias: "5",
    },
    CurrUser: username,
    CurrPass: password,
    CurrToken: "",
    CurrVersion: "2.0",
    SubscriptionLeft: "5",
  };

  return res.status(200).json(result);
      }
