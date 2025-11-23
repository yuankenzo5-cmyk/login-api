import { NextRequest, NextResponse } from "next/server"; import crypto from "crypto";

// ----- PUBLIC RSA KEY (ambil dari auth Android) ----- // NOTE: Ganti dengan public key Anda dalam format PEM const PUBLIC_KEY_PEM = -----BEGIN PUBLIC KEY----- MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQ...ISI -----END PUBLIC KEY-----;

// ----- Endpoint Login (POST) ----- export async function POST(req: NextRequest) { try { const body = await req.json();

const encoded = body.tokserver_hk;
if (!encoded) {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

let tokenJson;
try {
  tokenJson = Buffer.from(encoded, "base64").toString();
} catch {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

let token;
try {
  token = JSON.parse(tokenJson);
} catch {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

const Dados_hk = token.Dados_hk;
const Hash_hk = token.Hash_hk;
const Tok_hk = token.Tok_hk;

if (!Dados_hk || !Hash_hk || !Tok_hk) {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
}

// 1) Decrypt incoming Dados_hk with server PRIVATE KEY (client encrypted with server PUBLIC key)
let decrypted;
try {
  const buffer = Buffer.from(Dados_hk, "base64");
  decrypted = crypto.privateDecrypt(
    {
      key: PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  ).toString();
} catch (e) {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

// 2) Validate hash
const sha = crypto.createHash("sha256").update(decrypted).digest("hex");
if (sha !== Hash_hk) {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

let data;
try {
  data = JSON.parse(decrypted);
} catch {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

// Optional: validate data.User_hk, Uid_hk, Ip_hk, Tok_hk here (e.g. check against DB)

// Build response JSON matching Android expectations
const responseData = {
  ConnectSt_hk: "HasBeenSucceeded",
  Username: data.User_hk || "",
  Logged_UserHK: data.User_hk || "",
  Logged_TokHK: Tok_hk,
  MessageFromSv: "Login Successful"
};

const responseString = JSON.stringify(responseData);

// 3) Encrypt responseString with PRIVATE KEY so client (with PUBLIC KEY) can "decrypt"
let encryptedResponse;
try {
  encryptedResponse = crypto.privateEncrypt(
    {
      key: PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(responseString)
  ).toString("base64");
} catch (e) {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

const responseHash = crypto.createHash("sha256").update(responseString).digest("hex");

// 4) Sign responseString with PRIVATE KEY (server signature)
let signature;
try {
  signature = crypto.createSign("RSA-SHA256").update(responseString).sign(PRIVATE_KEY, "base64");
} catch (e) {
  return NextResponse.json({ error: "Key está inválida." }, { status: 400 });
}

return NextResponse.json(
  {
    Dados_hk: encryptedResponse,
    Hash_hk: responseHash,
    Sign_hk: signature
  },
  { status: 200 }
);

} catch (err) { return NextResponse.json({ error: "Key está inválida." }, { status: 400 }); } }
