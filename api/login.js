// api/login.js
import crypto from "crypto";

/**
 * Environment variables (set di Vercel):
 * - SIGN_SECRET  (string)  -> secret for HMAC signing (choose a strong one)
 * - ALLOWED_USER (opt)     -> example
 * - ALLOWED_PASS (opt)
 */
const SIGN_SECRET = process.env.SIGN_SECRET || "replace_sign_secret";

/** helper: parse urlencoded raw body */
async function parseUrlEncoded(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

/** helper: sha256 hex */
function sha256hex(strOrBuf) {
  return crypto.createHash("sha256").update(strOrBuf).digest("hex").toUpperCase();
}

/** helper: sign HMAC-SHA256 and return base64 */
function signBase64(dadosBase64) {
  return crypto.createHmac("sha256", SIGN_SECRET).update(dadosBase64).digest("base64");
}

/** Build Dados_hk: base64(JSONplain) */
function buildDados(obj) {
  const json = JSON.stringify(obj);
  return Buffer.from(json, "utf8").toString("base64");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).send("Method Not Allowed");
    }

    const body = await parseUrlEncoded(req);
    const tok = body.tokserver_hk || body.tokServer_hk || body.tok;

    if (!tok) {
      // APK expects something base64 even on error; return base64 of simple failed JSON
      const failDados = buildDados({ ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" });
      const failHash = sha256hex(failDados);
      const failSign = signBase64(failDados);
      return res.status(200).json({
        Dados_hk: failDados,
        Sign_hk: failSign,
        Hash_hk: failHash
      });
    }

    // tok is base64 string -> decode to JSON (pack)
    let pack;
    try {
      const decoded = Buffer.from(tok, "base64").toString("utf8");
      pack = JSON.parse(decoded);
    } catch (e) {
      // If parsing fails, return encrypted FAILED response (so APK won't show UNKNOWN)
      const failDados = buildDados({ ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" });
      const failHash = sha256hex(failDados);
      const failSign = signBase64(failDados);
      return res.status(200).json({
        Dados_hk: failDados,
        Sign_hk: failSign,
        Hash_hk: failHash
      });
    }

    // At this point we have pack, likely contains Dados_hk (ciphertext), Tok_hk, Hash_hk, etc.
    // Your app expects server to decrypt/process pack.Dados_hk and then reply.
    // For a simple compatible approach: we will NOT try to decrypt pack.Dados_hk here.
    // Instead, create the "decrypted response JSON" that the APK expects (adjust fields).
    //
    // Example decrypted JSON (must match app expectation EXACT keys):
    const usernameFromRequest = (pack?.username || pack?.user || "unknown");
    const decryptedResponse = {
      ConnectSt_hk: "HasBeenSucceeded",
      MessageFromSv: "Login OK",
      Logged_UserHK: usernameFromRequest,
      Logged_TokHK: (pack?.Tok_hk || pack?.tok || "TOK-FAKE-1234"),
      Username: usernameFromRequest
    };

    // Build Dados_hk (base64 of decryptedResponse JSON)
    const dadosBase64 = buildDados(decryptedResponse);

    // Hash_hk = SHA256 hex of dadosBase64 (uppercase to match sample)
    const hashhk = sha256hex(dadosBase64);

    // Sign_hk = HMAC-SHA256(dadosBase64, SIGN_SECRET) base64
    const signhk = signBase64(dadosBase64);

    // Return exactly the fields APK expects
    return res.status(200).json({
      Dados_hk: dadosBase64,
      Sign_hk: signhk,
      Hash_hk: hashhk
    });

  } catch (err) {
    console.error("login handler error:", err);
    // respond failed (base64 JSON)
    const failDados = buildDados({ ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" });
    const failHash = sha256hex(failDados);
    const failSign = signBase64(failDados);
    return res.status(200).json({
      Dados_hk: failDados,
      Sign_hk: failSign,
      Hash_hk: failHash
    });
  }
    }
