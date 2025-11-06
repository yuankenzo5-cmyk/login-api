// api/vip/Loader.js
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

async function parseAny(req){
  const ct=(req.headers["content-type"]||"").toLowerCase();
  if(req.method==="GET") return Object.fromEntries(new URL(req.url,"https://x").searchParams);
  let raw=""; for await (const c of req) raw+=c;
  if(ct.includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(raw));
  if(ct.includes("application/json")){ try{return JSON.parse(raw||"{}");}catch{} }
  return {};
}

export default async function handler(req,res){
  const p = await parseAny(req);
  const user = (p.user || p.username || "").toString();
  const pass = (p.pass || p.password || "").toString();
  // uid & token6 ikut diterima tapi tidak dipakai
  if(!user || !pass) return res.status(200).json({ status:"fail", message:"Usuário e/ou senha incorreta!" });

  try{
    const users = JSON.parse(await fs.readFile(path.join(process.cwd(),"data","users.json"),"utf8"));
    const u = users.find(x=>x.username===user);
    if(!u || !bcrypt.compareSync(pass, u.password))
      return res.status(200).json({ status:"fail", message:"Usuário e/ou senha incorreta!" });

    return res.status(200).json({ status:"success" });
  }catch(e){
    return res.status(500).json({ status:"error", message:e.message });
  }
  }
