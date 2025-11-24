// api/login.js
import crypto from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

const SIGN_SECRET = process.env.SIGN_SECRET || "change_me";
const XOR_KEY_HEX = process.env.XOR_KEY_HEX || "";
const ACCEPT_ANY = process.env.ACCEPT_ANY === "1";
const DEBUG = process.env.DEBUG === "1";

/* helpers */
const sha256 = x => crypto.createHash("sha256").update(x).digest("hex").toUpperCase();
const hmacBase64 = x => crypto.createHmac("sha256", SIGN_SECRET).update(x).digest("base64");
const xorBuf = (buf, keyBuf) => {
  const out = Buffer.alloc(buf.length);
  for (let i=0;i<buf.length;i++) out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  return out;
};

function buildOuter(dadosPlainJsonObj, mode="hmac") {
  // dadosBase64 = base64(JSONplain)  <-- if APK expects extra XOR/AES, we will adjust manually
  const dadosJson = JSON.stringify(dadosPlainJsonObj);
  const dadosBase64 = Buffer.from(dadosJson, "utf8").toString("base64");
  const hash = sha256(dadosBase64);
  let sign;
  if (mode === "hmac") sign = hmacBase64(dadosBase64);
  else sign = ""; // placeholder for RSA (if you later provide private key)
  return { Dados_hk: dadosBase64, Sign_hk: sign, Hash_hk: hash };
}

/* main */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const params = req.body || {};
    const tok = params.tokserver_hk || params.tok || params.tokServer_hk;

    if (!tok) {
      // return encrypted failed payload (base64 outer) like APK expects
      const out = buildOuter({ ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" });
      return res.status(200).type("text/plain").send(Buffer.from(JSON.stringify(out)).toString("base64"));
    }

    // try parse outer pack sent by APK
    let pack = null;
    try { pack = JSON.parse(Buffer.from(tok, "base64").toString()); }
    catch(e) {
      // if cannot parse, log and return failed
      console.error("Cannot parse tokserver_hk base64->json:", e);
      if (DEBUG) return res.status(200).send(Buffer.from(JSON.stringify({err:"badpack"})).toString("base64"));
      const out = buildOuter({ ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" });
      return res.status(200).type("text/plain").send(Buffer.from(JSON.stringify(out)).toString("base64"));
    }

    // Log pack for debugging
    console.log("PACK:", pack);

    // If Dados_hk exists -> attempt to decode inner
    let inner = null;
    if (pack.Dados_hk) {
      const innerBuf = Buffer.from(pack.Dados_hk, "base64");
      // Try XOR if key provided
      if (XOR_KEY_HEX && XOR_KEY_HEX.length % 2 === 0) {
        try {
          const keyBuf = Buffer.from(XOR_KEY_HEX, "hex");
          const plain = xorBuf(innerBuf, keyBuf);
          const txt = plain.toString("utf8");
          try { inner = JSON.parse(txt); console.log("Inner JSON via XOR:", inner); }
          catch(e) { console.log("Inner text via XOR (not JSON):", txt.slice(0,200)); inner = txt; }
        } catch(e) { console.log("XOR attempt failed:", e); }
      } else {
        // No XOR key => show raw base64 decode attempt
        try {
          const txt = innerBuf.toString("utf8");
          try { inner = JSON.parse(txt); console.log("Inner JSON (no xor):", inner); }
          catch(e) { inner = txt; console.log("Inner raw text (no xor):", txt.slice(0,200)); }
        } catch(e) { console.log("Inner raw decode failed"); }
      }
    }

    // DEBUG: return a diagnostic response (base64) if DEBUG mode and caller added header X-Debug: 1
    if (DEBUG && req.headers["x-debug"] === "1") {
      const dbg = { pack, inner, XOR_KEY_HEX: !!XOR_KEY_HEX };
      return res.status(200).type("text/plain").send(Buffer.from(JSON.stringify(dbg)).toString("base64"));
    }

    // Decide validation: (simple)
    let ok = false;
    // If ACCEPT_ANY enabled accept
    if (ACCEPT_ANY) ok = true;
    // If Tok_hk present consider ok
    if (pack.Tok_hk || pack.tok_hk || pack.Tok) ok = true;
    // If inner contains username/password and env ALLOWED set, check them
    const ALLOWED_USER = process.env.ALLOWED_USER, ALLOWED_PASS = process.env.ALLOWED_PASS;
    if (!ok && inner && typeof inner === "object" && inner.username && ALLOWED_USER && ALLOWED_PASS) {
      ok = (inner.username === ALLOWED_USER && inner.password === ALLOWED_PASS);
    }

    const decryptedResponse = ok ?
      { ConnectSt_hk: "HasBeenSucceeded", MessageFromSv: "Login OK", Logged_UserHK: inner?.username || "u", Logged_TokHK: pack.Tok_hk || "TOK-FAKE" } :
      { ConnectSt_hk: "Failed", MessageFromSv: "Dados incorretos" };

    // Build outer with HMAC mode by default
    const outer = buildOuter(decryptedResponse, "hmac");

    // If APK still rejects, we may try alternate variants (hash over JSON instead of base64, sign differently)
    // For debugging we will produce log messages
    console.log("Outer to send:", outer);

    // Send final as base64 string (not JSON)
    const final = Buffer.from(JSON.stringify(outer)).toString("base64");
    return res.status(200).type("text/plain").send(final);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    const out = buildOuter({ ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" });
    return res.status(200).type("text/plain").send(Buffer.from(JSON.stringify(out)).toString("base64"));
  }
    }
