// api/login.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { URLSearchParams } from "url";

function toBase64JSON(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

function sendBase64(res, obj, status = 200) {
  const out = toBase64JSON(obj);
  res.status(status).setHeader("Content-Type", "text/plain").send(out);
}

function parseBodyGuess(req) {
  // Vercel biasanya sudah parse JSON -> req.body object.
  if (!req.body) return null;
  // If it's already an object, return it
  if (typeof req.body === "object") return req.body;

  // If it's a string (raw) try parse JSON first
  if (typeof req.body === "string") {
    const raw = req.body.trim();
    try {
      return JSON.parse(raw);
    } catch (e) {
      // try urlencoded
      if (raw.includes("=")) {
        const p = new URLSearchParams(raw);
        const out = {};
        for (const [k, v] of p.entries()) out[k] = v;
        return out;
      }
      return null;
    }
  }
  return null;
}

export const config = {
  api: {
    bodyParser: false, // supaya bisa baca body manual
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return sendBase64(res, {
        Status: "Failed",
        Message: "Only POST method allowed",
        SubscriptionLeft: "0",
      }, 405);
    }

    // 🔹 BACA RAW BODY MANUAL
    const raw = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    // 🔹 LOG DI SINI
    console.log("RAW BODY:", raw);

    // 🔹 COBA PARSE KE JSON ATAU FORM
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      const p = new URLSearchParams(raw);
      body = {};
      for (const [k, v] of p.entries()) body[k] = v;
    }

    // 🔹 LOG SETELAH PARSE
    console.log("PARSED BODY:", body);

    if (!body.username || !body.password) {
      return sendBase64(res, {
        Status: "Failed",
        Message: "Invalid JSON body",
        SubscriptionLeft: "0",
      }, 400);
    }

    // ... lanjutkan proses login, validasi, dll.
    const { username, password } = body;

    // valid credentials (ubah sesuai kebutuhan)
    const validUser = process.env.VALID_USER || "brmod";
    const validPass = process.env.VALID_PASS || "123";

    const isValid = username === validUser && password === validPass;

    // baca loader.zip dari folder public (letakkan file di public/loader.zip)
    const loaderPath = path.join(process.cwd(), "public", "loader.zip");
    let loaderBase64 = "";
    if (fs.existsSync(loaderPath)) {
      loaderBase64 = fs.readFileSync(loaderPath).toString("base64");
    }

    // susun MessageString (ubah jika perlu agar cocok dengan loader)
    const messageStringObj = {
      Cliente: username,
      Dias: isValid ? "5" : "0"
    };
    const messageString = JSON.stringify(messageStringObj);

    // Data: gunakan loaderBase64 (atau bisa diganti format lain)
    const Data = loaderBase64 || "";

    // Hash: SHA256 dari Data (jika Data kosong, hash jadi "")
    const Hash = Data ? crypto.createHash("sha256").update(Data).digest("hex") : "";

    // Sign: tandatangani Hash (lebih kecil) -> base64
    let Sign = "";
    const privateKeyEnv = process.env.PRIVATE_KEY || "";
    if (privateKeyEnv && Hash) {
      try {
        const pem = privateKeyEnv.includes("-----BEGIN")
          ? privateKeyEnv
          : privateKeyEnv.replace(/\\n/g, "\n");
        const signer = crypto.createSign("RSA-SHA256");
        signer.update(Hash);
        signer.end();
        Sign = signer.sign(pem, "base64");
      } catch (e) {
        console.error("sign error:", e.message || e);
        Sign = Buffer.from("dummy-sign").toString("base64");
      }
    } else {
      // fallback: dummy sign (so apk always receives a base64 Sign)
      Sign = Buffer.from("dummy-sign").toString("base64");
    }

    // Susun response object (sesuaikan fields)
    const responseObj = {
      Data,
      Sign,
      Hash,
      MessageString: messageString,
      CurrUser: username,
      CurrPass: password,
      CurrToken: "",
      CurrVersion: "2.0",
      SubscriptionLeft: isValid ? "5" : "0",
      Status: isValid ? "Success" : "Failed"
    };

    // kirim: seluruh JSON di-base64-kan menjadi satu string (text/plain)
    return sendBase64(res, responseObj, 200);

  } catch (err) {
    console.error("handler fatal:", err);
    return sendBase64(res, {
      Status: "Failed",
      Message: "Server error",
      SubscriptionLeft: "0"
    }, 500);
  }
}
