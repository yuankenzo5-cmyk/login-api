// api/loginbrmods.js  (Node 18+ / Vercel serverless)
import { json } from 'body-parser';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

async function readBody(req) {
  return new Promise((res, rej) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => res(data));
    req.on('error', e => rej(e));
  });
}

function xorDecode(decodedStr, key) {
  if (!key) return decodedStr;
  let out = [];
  for (let i = 0; i < decodedStr.length; i++) {
    const a = decodedStr.charCodeAt(i);
    const b = key.charCodeAt(i % key.length);
    out.push(String.fromCharCode(a ^ b));
  }
  return out.join('');
}

function makeResponse(status, msg, extra = {}) {
  return { Status: status, MessageString: msg, ...extra };
}

// simple file-based user store (not for prod)
const USER_DB = '/tmp/brmods_users.json';
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USER_DB,'utf8')); } catch(e){ return {}; }
}
function saveUsers(u){ fs.writeFileSync(USER_DB, JSON.stringify(u, null, 2)); }

export default async function handler(req, res) {
  // allow GET health-check
  if (req.method === 'GET') return res.status(200).send('OK');

  const raw = await readBody(req);
  // try parse JSON body (APK maybe sends JSON or form)
  let body;
  try { body = JSON.parse(raw); } catch(e){
    // try urlencoded parse if necessary
    const m = raw.match(/^\s*Data=([^&]*)&Sign=([^&]*)/i);
    if (m) body = { Data: decodeURIComponent(m[1]), Sign: decodeURIComponent(m[2]) };
  }

  if (!body || !body.Data || !body.Sign) {
    return res.status(400).json(makeResponse('Failed', 'Missing Data/Sign'));
  }

  // Step 1. base64-decode Data
  let bin;
  try {
    bin = Buffer.from(body.Data, 'base64').toString('utf8'); // matches fromBase64String -> String
  } catch(e){
    return res.status(400).json(makeResponse('Failed', 'Invalid base64'));
  }

  // Step 2. XOR with Sign key (same as app)
  const key = body.Sign;
  const dec = xorDecode(bin, key);

  // save full decoded for debug (careful with sensitive data)
  try { fs.writeFileSync('/tmp/profile_full.json', dec, 'utf8'); } catch(e){}

  // try parse decoded string as JSON
  let payload;
  try { payload = JSON.parse(dec); } catch(e){
    // not JSON? return raw for debugging
    return res.status(200).json(makeResponse('Failed', 'Decoded not JSON', { raw: dec.slice(0,500) }));
  }

  // --- now implement login logic (clone) ---
  // expected fields inside payload depend on app; likely has CurrUser / CurrPass or similar
  const users = loadUsers();
  // example payload fields: Cliente, CurrUser, CurrPass, CurrToken ...
  const user = payload.CurrUser || payload.user || payload.username || payload.Cliente;
  const pass = payload.CurrPass || payload.pass || payload.password;

  if (!user) {
    return res.status(200).json(makeResponse('Failed', 'No user in payload'));
  }

  // if user not exists -> create? (clone behaviour: you said "tambah user ke server")
  if (!users[user]) {
    // create default account with pass from payload if provided
    users[user] = { pass: pass || '', created: new Date().toISOString(), vip: false };
    saveUsers(users);
  }

  // check password
  const valid = users[user].pass === (pass||'') || users[user].pass === '' ;

  // sample "already in use" check:
  if (users[user].inUse) {
    return res.status(200).json(makeResponse('Failed', 'User already in use!'));
  }

  if (!valid) {
    return res.status(200).json(makeResponse('Failed', 'Invalid credentials'));
  }

  // mark as logged in (simple)
  users[user].inUse = true;
  users[user].lastLogin = new Date().toISOString();
  saveUsers(users);

  // respond with same structure as original server might
  const successExtra = {
    CurrUser: user,
    CurrPass: users[user].pass,
    CurrToken: 'SAMPLE-TOKEN-' + Math.random().toString(36).slice(2,10),
    SubscriptionLeft: '30',
    CurrVersion: '2.0'
  };

  return res.status(200).json(makeResponse('Success', 'Logged in', successExtra));
      }
