// api/login.js
import crypto from "crypto";

/**
 * ENV:
 * XOR_KEY_HEX - optional, hex string of XOR key used by APK (ex: 9949... length even)
 * SIGN_SECRET - required for HMAC signature (choose secret). If APK expects RSA, replace signing.
 * ACCEPT_ANY - if "1", server accepts any credentials (useful for testing).
 * DEBUG - if "1", server returns diagnostic JSON when accessed via browser (only for testing).
 */

const XOR_KEY_HEX = process.env.XOR_KEY_HEX || "";
const SIGN_SECRET = process.env.SIGN_SECRET || "change_this_sign_secret";
const ACCEPT_ANY = process.env.ACCEPT_ANY === "1";
const DEBUG = process.env.DEBUG === "1";

/* helpers */
function parseUrlEncodedRaw(req) {
  return new Promise((resolve) => {
    const arr = [];
    req.on("data", d => arr.push(d));
    req.on("end", () => {
      const raw = Buffer.concat(arr).toString("utf8");
      const params = new URLSearchParams(raw);
      const out = {};
      for (const [k, v] of params.entries()) out[k] = v;
      resolve(out);
    });
  });
}

function sha256HexUpper(input) {
  return crypto.createHash("sha256").update(input).digest("hex").toUpperCase();
}
function hmacSha256Base64(input) {
  return crypto.createHmac("sha256", SIGN_SECRET).update(input).digest("base64");
}

function xorBuffer(buf, keyBuf) {
  const out = Buffer.alloc(buf.length);
  const klen = keyBuf.length;
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ keyBuf[i % klen];
  }
  return out;
}

/* Try to decode pack.tokserver_hk and inner Dados_hk (if any). Return object with debug info */
async function decodeIncoming(tokBase64) {
  const info = { ok: false, error: null, pack: null, innerPlain: null };
  try {
    const packJson = Buffer.from(tokBase64, "base64").toString("utf8");
    const pack = JSON.parse(packJson);
    info.pack = pack;

    if (pack.Dados_hk) {
      // Dados_hk is base64 usually
      const innerBuf = Buffer.from(pack.Dados_hk, "base64");
      // If XOR key provided, try XOR decrypt
      if (XOR_KEY_HEX && XOR_KEY_HEX.length % 2 === 0) {
        try {
          const keyBuf = Buffer.from(XOR_KEY_HEX, "hex");
          const plainBuf = xorBuffer(innerBuf, keyBuf);
          // If plainBuf is JSON text, parse
          try {
            const txt = plainBuf.toString("utf8");
            info.innerPlain = JSON.parse(txt);
          } catch (e) {
            // maybe it's not directly JSON (could be AES afterwards) - keep raw text attempt
            info.innerPlain = plainBuf.toString("utf8", 0, Math.min(1024, plainBuf.length));
          }
        } catch (e) {
          // XOR failed
          info.error = "XOR-decrypt-failed:" + String(e);
        }
      } else {
        // no XOR key - return base64 raw
        info.innerPlain = "<no-xor-key-supplied>";
      }
    }

    info.ok = true;
  } catch (e) {
    info.error = "decode-tok-failed:" + String(e);
  }
  return info;
}

/* Build the outer response JSON and return base64 string to send as body */
function buildOuterResponseJsonAndEncode(decryptedResponseJson) {
  // Dados_hk is base64 of the decryptedResponseJson
  const dadosBase64 = Buffer.from(JSON.stringify(decryptedResponseJson), "utf8").toString("base64");

  const hashhk = sha256HexUpper(dadosBase64); // uppercase hex as sample
  const signhk = hmacSha256Base64(dadosBase64);

  const outer = {
    Dados_hk: dadosBase64,
    Sign_hk: signhk,
    Hash_hk: hashhk
  };

  const outerStr = JSON.stringify(outer);
  const outerBase64 = Buffer.from(outerStr, "utf8").toString("base64");

  return { outer, outerBase64 };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET" && DEBUG) {
      return res.status(200).json({
        info: "login endpoint (debug mode)",
        XOR_KEY_HEX: XOR_KEY_HEX ? ("present, length " + XOR_KEY_HEX.length) : "not set",
        SIGN_SECRET_set: SIGN_SECRET ? true : false
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).send("Method Not Allowed");
    }

    const params = await parseUrlEncodedRaw(req);
    const tok = params.tokserver_hk || params.tok || params.tokServer_hk;

    // If missing, return encrypted 'Failed' payload (so APK shows 'User Invalido' or other)
    if (!tok) {
      const failPlain = { ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" };
      const built = buildOuterResponseJsonAndEncode(failPlain);
      // send as base64 string body (not JSON)
      res.status(200).type("text/plain").send(built.outerBase64);
      return;
    }

    // try to decode incoming tokserver_hk
    const decoded = await decodeIncoming(tok);

    // if decoded.innerPlain is JSON object, try to read username/password or other fields
    let username = null;
    let password = null;
    let tok_hk = null;
    if (decoded && decoded.pack) {
      tok_hk = decoded.pack.Tok_hk || decoded.pack.tok_hk || decoded.pack.Tok;
      // If we decoded innerPlain and it's an object, use fields
      if (decoded.innerPlain && typeof decoded.innerPlain === "object") {
        username = decoded.innerPlain.username || decoded.innerPlain.user || decoded.innerPlain.Username || decoded.innerPlain.Username_hk || null;
        password = decoded.innerPlain.password || decoded.innerPlain.pass || null;
      }
    }

    // Decide if login valid
    let ok = false;
    if (ACCEPT_ANY) ok = true;
    // If Tok_hk present, accept
    if (!ok && tok_hk) ok = true;
    // Example check: username/password match env values
    const ALLOWED_USER = process.env.ALLOWED_USER;
    const ALLOWED_PASS = process.env.ALLOWED_PASS;
    if (!ok && username && ALLOWED_USER && ALLOWED_PASS) {
      ok = (username === ALLOWED_USER && password === ALLOWED_PASS);
    }

    // Build decryptedResponse JSON which APK will expect after decrypt:
    // Must match keys APK checks for. Use typical fields:
    let decryptedResponse;
    if (ok) {
      decryptedResponse = {
        ConnectSt_hk: "HasBeenSucceeded",
        MessageFromSv: "Login OK",
        Logged_UserHK: username || "unknown",
        Logged_TokHK: tok_hk || "TOK-FAKE-0001",
        Username: username || "unknown"
      };
    } else {
      decryptedResponse = {
        ConnectSt_hk: "Failed",
        MessageFromSv: "User Invalido"
      };
    }

    const built = buildOuterResponseJsonAndEncode(decryptedResponse);

    // Send as plain base64 string (not JSON)
    res.status(200).type("text/plain").send(built.outerBase64);

  } catch (err) {
    console.error("login handler error:", err);
    // fallback failed response
    const failPlain = { ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" };
    const built = buildOuterResponseJsonAndEncode(failPlain);
    res.status(200).type("text/plain").send(built.outerBase64);
  }
           }
