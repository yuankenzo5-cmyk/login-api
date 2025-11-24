// api/login.js
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

// CONFIG via ENV
const SIGN_SECRET = process.env.SIGN_SECRET || "change_this_secret";
const ACCEPT_KEY = process.env.ACCEPT_KEY || "yanz"; // default key that will be accepted
const ACCEPT_ANY = process.env.ACCEPT_ANY === "1"; // if set, accept any key
const DEBUG = process.env.DEBUG === "1";

function readRawBody(req) {
  return new Promise((resolve) => {
    let acc = "";
    req.on("data", c => acc += c.toString());
    req.on("end", () => resolve(acc));
    req.on("error", () => resolve(""));
  });
}

function parseUrlEncoded(raw) {
  if (!raw) return {};
  return Object.fromEntries(raw.split("&").map(pair => {
    const [k = "", v = ""] = pair.split("=");
    try {
      return [decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g," "))];
    } catch (e) {
      return [k, v];
    }
  }));
}

function sha256HexUpper(x) {
  return crypto.createHash("sha256").update(x).digest("hex").toUpperCase();
}

function hmacBase64(secret, x) {
  return crypto.createHmac("sha256", secret).update(x).digest("base64");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).send("Method Not Allowed");
    }

    const raw = await readRawBody(req);
    const params = parseUrlEncoded(raw);
    const key = params.key || params.tokserver_hk || params.tok || params.token || "";

    if (DEBUG) console.log("raw:", raw, "params:", params);

    // Check key
    const ok = ACCEPT_ANY || (key && key === ACCEPT_KEY);

    // Build inner response depending on success
    const inner = ok
      ? { ConnectSt_hk: "HasBeenSucceeded", MessageFromSv: "Login OK", Logged_UserHK: "user123", Logged_TokHK: "tok_fake_abc" }
      : { ConnectSt_hk: "Failed", MessageFromSv: "Dados Incorretos" };

    const dadosBase64 = Buffer.from(JSON.stringify(inner), "utf8").toString("base64");
    const hash = sha256HexUpper(dadosBase64);
    const sign = hmacBase64(SIGN_SECRET, dadosBase64);

    const outer = { Dados_hk: dadosBase64, Sign_hk: sign, Hash_hk: hash };
    const outerBase64 = Buffer.from(JSON.stringify(outer), "utf8").toString("base64");

    // Return as plain text (APK expects plain base64 body)
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(outerBase64);

  } catch (err) {
    console.error("login error", err);
    const failInner = { ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" };
    const dadosBase64 = Buffer.from(JSON.stringify(failInner), "utf8").toString("base64");
    const hash = sha256HexUpper(dadosBase64);
    const sign = hmacBase64(SIGN_SECRET, dadosBase64);
    const outer = { Dados_hk: dadosBase64, Sign_hk: sign, Hash_hk: hash };
    const outerBase64 = Buffer.from(JSON.stringify(outer), "utf8").toString("base64");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(outerBase64);
  }
                                        }
