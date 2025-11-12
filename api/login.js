// api/login.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  // Jika bukan POST, tampilkan HTML yang meniru output PHP (untuk debug/view di browser)
  if (req.method === "GET") {
    const phpLikeHtml = `
      <br /><b>Warning</b>:  Undefined array key "token" in <b>/www/wwwroot/brmod.infernomods.fun/vip/login-br.php</b> on line <b>40</b><br />
      <br /><b>Warning</b>:  Trying to access array offset on value of type null in <b>/www/wwwroot/brmod.infernomods.fun/vip/login-br.php</b> on line <b>44</b><br />
      <br /><b>Notice</b>:  Decryption error in <b>/www/wwwroot/brmod.infernomods.fun/vip/phpseclib/Crypt/RSA.php</b> on line <b>2788</b><br />
      <br /><b>Warning</b>:  Trying to access array offset on value of type null in <b>/www/wwwroot/brmod.infernomods.fun/vip/login-br.php</b> on line <b>64</b><br />
      <pre style="white-space:pre-wrap;word-break:break-all;">
eyJEYXRhIjoiU2hOaVRW... (base64 payload contoh)
      </pre>
    `;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(phpLikeHtml);
  }

  // POST: parse body (Vercel passes body parsed as JSON if "application/json")
  // Support either JSON body or URL-encoded form sent from tools like ReqBin
  let body = {};
  if (req.headers["content-type"] && req.headers["content-type"].includes("application/json")) {
    body = req.body || {};
  } else {
    // fallback: req.body might be string; try to parse "username=..." style
    body = req.body || {};
  }

  const username = body.username || body.user || "";
  const password = body.password || body.pass || "";

  // contoh validasi sederhana (ganti sesuai logikamu)
  const isValid = (username === "brmod" && password === "123");

  // coba baca loader.zip dari folder public
  const loaderPath = path.join(process.cwd(), "public", "loader.zip");
  let loaderBase64 = "NO_LOADER_FOUND";
  try {
    if (fs.existsSync(loaderPath)) {
      const buff = fs.readFileSync(loaderPath);
      loaderBase64 = buff.toString("base64");
    }
  } catch (err) {
    // ignore, gunakan placeholder
    loaderBase64 = "NO_LOADER_FOUND";
  }

  // payload object (sesuaikan format yang ingin kamu kembalikan)
  const payload = {
    Status: isValid ? "Success" : "Failed",
    Loader: loaderBase64,                // << Loader sebagai base64
    MessageString: isValid
      ? { Cliente: "brmod", Dias: "5" }
      : { Cliente: "brmod", Dias: "0" },
    CurrUser: username,
    CurrPass: password,
    CurrToken: "",
    CurrVersion: "2.0",
    SubscriptionLeft: isValid ? "5" : "0"
  };

  // jika query ?encode=full=1 maka encode seluruh JSON jadi base64 (string)
  // contoh: POST /api/login?encode=full=1
  const url = new URL(req.url, `http://${req.headers.host}`);
  const encodeFull = url.searchParams.get("encode") === "full" || url.searchParams.get("encode") === "1";

  if (encodeFull) {
    const jsonStr = JSON.stringify(payload);
    const base64All = Buffer.from(jsonStr).toString("base64");
    // kembalikan sebagai plain text (atau bisa dibungkus JSON jika mau)
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(base64All);
  } else {
    // default: return JSON with Loader already base64
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(payload);
  }
                   }
