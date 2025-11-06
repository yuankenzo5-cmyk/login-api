// api/vip/loginbrmods.js
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

async function parseAny(req){
  const ct=(req.headers["content-type"]||"").toLowerCase();
  if(req.method==="GET") return Object.fromEntries(new URL(req.url,"https://x").searchParams);
  let raw=""; for await (const c of req) raw+=c;
  if(ct.includes("application/json")||raw.trim().startsWith("{")){ try{return JSON.parse(raw||"{}");}catch{} }
  if(ct.includes("application/x-www-form-urlencoded")||raw.includes("=")){ try{return Object.fromEntries(new URLSearchParams(raw));}catch{} }
  return {};
}

export default async function handler(req,res){
  const p = await parseAny(req);
  // APK-mu kirim form "token=...". Kita terima tapi tidak validasi ketat.
  const token = (p.token || p.auth || p.t || "").toString();

  // Buat payload mirip oldhost: {Data, Sign, Hash}
  // Data: string base64; Sign: HMAC-SHA256(base64 Data); Hash: SHA256(base64 Data) HEX UPPERCASE
  const dataB64 = Buffer.from(crypto.randomBytes(64)).toString("base64");
  const signB64 = crypto.createHmac("sha256", process.env.SIGN_SECRET || "secret")
                        .update(dataB64).digest("base64");
  const hashHex = crypto.createHash("sha256").update(dataB64).digest("hex").toUpperCase();

  const payload = { Data: dataB64, Sign: signB64, Hash: hashHex };
  const toSend = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

  // Oldhost mengirim sebagai text/plain
  res.status(200).setHeader("Content-Type","text/plain; charset=utf-8").send(toSend);
}
