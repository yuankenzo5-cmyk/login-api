// mode token saja (dan tetap dukung user/pass kalau perlu)
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
  const token = (p.token || p.auth || p.t || "").toString();

  if (token) {
    // ⚠️ kirim minimal, semuanya string:
    const body = JSON.stringify({ Cliente: "token", Dias: "365" });
    return res
      .status(200)
      .setHeader("Content-Type", "text/plain; charset=utf-8")
      .send(body);
  }

  // (opsional) fallback user/pass di sini kalau kamu masih mau dukung
  return res.status(400).json({ error: "Semua field wajib diisi!" });
}
