// api/login.js
import crypto from "crypto";
import qs from "querystring";

export const config = { api: { bodyParser: false } };

// CONFIG via ENV
const VALID_KEY = process.env.VALID_KEY || "jslbbs";
const INCLUDE_DADOS = (process.env.INCLUDE_DADOS === "1"); // if true, include Dados_hk, Hash_hk, Sign_hk
const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY_PEM || "";   // optional RSA private key (PEM) for signing
const RETURN_BASE64OUT = (process.env.RETURN_BASE64OUT === "1"); // if true return base64(outerJSON) as plain text

function readRawBody(req) {
  return new Promise((resolve) => {
    let acc = "";
    req.on("data", c => acc += c.toString());
    req.on("end", () => resolve(acc));
    req.on("error", () => resolve(""));
  });
}

function sha256HexUpper(input) {
  return crypto.createHash("sha256").update(input).digest("hex").toUpperCase();
}

function hmacBase64(key, input) {
  return crypto.createHmac("sha256", key).update(input).digest("base64");
}

function rsaSignBase64(privateKeyPem, input) {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(input, "utf8");
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

function parseFormOrJson(raw, headers) {
  if (!raw) return {};
  const ct = (headers['content-type'] || "").toLowerCase();
  if (ct.includes("application/x-www-form-urlencoded")) {
    try { return qs.parse(raw); } catch (e) { return {}; }
  }
  if (ct.includes("application/json")) {
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }
  // fallback: try parse as form
  try { return qs.parse(raw); } catch (e) { return {}; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ MessageFromSv: "Método inválido" });
    }

    const raw = await readRawBody(req);
    const params = parseFormOrJson(raw, req.headers);

    // Accept common param names
    // APK sometimes sends tokserver_hk as base64(inner), or 'key', or direct 'user'+'token'
    const tokserver_hk = params.tokserver_hk || params.tok || params.token || params.key || "";
    let user = params.user || params.username || params.Username || "";
    let token = params.token || params.rdToken || params.tokserver_token || params.token_server || "";

    // If tokserver_hk present and looks like base64, try decode to JSON to extract fields
    if (tokserver_hk) {
      try {
        // If tokserver_hk is a base64 string of inner JSON
        const decoded = Buffer.from(tokserver_hk.replace(/\s+/g,''), "base64").toString("utf8");
        try {
          const inner = JSON.parse(decoded);
          // prefer inner fields if present
          user = user || inner.user || inner.Username || inner.Logged_UserHK || inner.username || "";
          token = token || inner.token || inner.logged_token || inner.Logged_TokHK || inner.token_server || "";
        } catch (e) {
          // not JSON — might be plain key; keep as key
        }
      } catch (e) {
        // ignore decode errors
      }
    }

    // If still no user/token, maybe key param used to validate
    const keyParam = tokserver_hk || params.key || "";

    if (!user || !token) {
      // if key param provided and equals VALID_KEY, we can accept but need default user/token
      if (keyParam && keyParam === VALID_KEY) {
        user = user || "user_example";
        token = token || "token_example_abc123";
      } else {
        return res.status(200).json({ MessageFromSv: "Insira seus dados" });
      }
    }

    // If a validation key was provided and it's wrong, fail
    if (params.key && params.key !== VALID_KEY && !(tokserver_hk && tokserver_hk === VALID_KEY)) {
      return res.status(200).json({ MessageFromSv: "Dados Incorretos" });
    }

    // SUCCESS -> build response that APK expects
    const innerResponse = {
      ConnectSt_hk: "HasBeenSucceeded",
      MessageFromSv: "Login efetuado com sucesso",
      Logged_UserHK: user,
      Logged_TokHK: token,
      Username: user
    };

    const outer = {
      ConnectSt_hk: innerResponse.ConnectSt_hk,
      Logged_UserHK: innerResponse.Logged_UserHK,
      Logged_TokHK: innerResponse.Logged_TokHK,
      Username: innerResponse.Username,
      MessageFromSv: innerResponse.MessageFromSv
    };

    // optionally include Dados_hk / Hash_hk / Sign_hk for compatibility
    if (INCLUDE_DADOS) {
      const innerJson = JSON.stringify(innerResponse);
      const dados_b64 = Buffer.from(innerJson, "utf8").toString("base64");
      const hash_hex = sha256HexUpper(dados_b64);

      let sign_b64;
      if (PRIVATE_KEY_PEM && PRIVATE_KEY_PEM.trim().length > 20) {
        try {
          sign_b64 = rsaSignBase64(PRIVATE_KEY_PEM, innerJson);
        } catch (e) {
          // fallback to HMAC
          sign_b64 = hmacBase64(VALID_KEY, innerJson);
        }
      } else {
        sign_b64 = hmacBase64(VALID_KEY, innerJson);
      }

      outer.Dados_hk = dados_b64;
      outer.Hash_hk = hash_hex;
      outer.Sign_hk = sign_b64;
    }

    // return either raw JSON or base64(outerJSON) according to RETURN_BASE64OUT
    if (RETURN_BASE64OUT) {
      const outB64 = Buffer.from(JSON.stringify(outer), "utf8").toString("base64");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(outB64);
    } else {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json(outer);
    }
  } catch (err) {
    console.error("login api error:", err);
    return res.status(500).json({ MessageFromSv: "Server error" });
  }
}
