// api/login.js  (Vercel Serverless - Node/JS)
import fs from "fs";
import path from "path";
import querystring from "querystring";

/**
 * Helper: encode response object jadi base64 (JSON string, no extra)
 */
function toBase64(obj) {
  const j = JSON.stringify(obj);
  return Buffer.from(j, "utf8").toString("base64");
}

/**
 * Helper: read loader.zip (jika ada) dan return base64 string
 */
function readLoaderBase64() {
  // coba beberapa lokasi umum: public/loader.zip atau api/loader.zip (sesuai repo mu)
  const candidates = [
    path.join(process.cwd(), "public", "loader.zip"),
    path.join(process.cwd(), "api", "loader.zip"),
    path.join(process.cwd(), "loader.zip"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p).toString("base64");
      }
    } catch (e) {
      // ignore
    }
  }
  return ""; // kosong jika tidak ada
}

export default async function handler(req, res) {
  // hanya POST (APK biasanya POST)
  if (req.method !== "POST") {
    const payload = { Status: "Failed", Message: "Only POST method allowed", SubscriptionLeft: "0" };
    return res.status(405).send(toBase64(payload));
  }

  // body parsing: Vercel sudah parse JSON otomatis IF content-type application/json
  // APK mungkin mengirim form-urlencoded -> kita handle itu
  let body = req.body;

  // If body is a raw string from form-urlencode, parse
  if (typeof body === "string") {
    // contoh: "username=brmod&password=123" atau "token=...."
    try {
      body = querystring.parse(body);
    } catch (e) {
      body = {};
    }
  }

  // Some APKs send x-www-form-urlencoded but Vercel gives object already; OK.
  // Also accept field "token" directly: apk sometimes sends token=BASE64STRING
  const username = (body.username || body.user || "").toString();
  const password = (body.password || body.pass || "").toString();
  const token = body.token || "";

  // Kredensial yang benar (sampel)
  const validUser = "brmod";
  const validPass = "123";

  // baca loader.zip jika ada (base64)
  const loaderBase64 = readLoaderBase64();

  // Response jika valid
  if ((username === validUser && password === validPass) || token) {
    // Jika token dikirim dari apk, kamu bisa juga memvalidasi token di sini.
    const responseObj = {
      Data: "Sm9obkRvZVZhbGluZz0=", // contoh field Data (bisa kamu ubah)
      Sign: "U0...=",              // contoh Sign
      Hash: "A10791D45981C1DF8F2B93B...", // contoh Hash
      Status: "Success",
      Loader: loaderBase64,       // jika ada loader.zip -> base64 string, kalau kosong -> ""
      MessageString: {
        Cliente: username || "brmod",
        Dias: "5",
      },
      CurrUser: username || "brmod",
      CurrPass: password || "123",
      CurrToken: token || "",
      CurrVersion: "2.0",
      SubscriptionLeft: "5",
    };

    const out = toBase64(responseObj);
    // log untuk debugging (akan muncul di Vercel Logs)
    console.log("[login] success, returning base64 len=", out.length);
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(out);
  }

  // Jika login gagal -> masih base64
  const failObj = {
    Status: "Failed",
    Message: "Invalid login or form body",
    SubscriptionLeft: "0",
  };
  const outFail = toBase64(failObj);
  console.log("[login] failed, returning base64 len=", outFail.length);
  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(outFail);
}
