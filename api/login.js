import crypto from "crypto";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
      extended: true,
    },
  },
};

const SIGN_SECRET = process.env.SIGN_SECRET || "secret123";
const XOR_KEY_HEX = process.env.XOR_KEY_HEX || "";
const ACCEPT_ANY = process.env.ACCEPT_ANY === "1";

function sha256HexUpper(x) {
  return crypto.createHash("sha256").update(x).digest("hex").toUpperCase();
}

function hmacBase64(x) {
  return crypto.createHmac("sha256", SIGN_SECRET).update(x).digest("base64");
}

function xorDecrypt(buf, keyBuf) {
  const out = Buffer.alloc(buf.length);
  const k = keyBuf.length;
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ keyBuf[i % k];
  return out;
}

export default function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const params = req.body; // VERCEL AUTO-PARSE
    const tok = params.tokserver_hk;

    if (!tok) {
      const fail = {
        ConnectSt_hk: "Failed",
        MessageFromSv: "User Invalido"
      };
      const dados = Buffer.from(JSON.stringify(fail)).toString("base64");
      const out = {
        Dados_hk: dados,
        Sign_hk: hmacBase64(dados),
        Hash_hk: sha256HexUpper(dados)
      };
      return res.status(200).send(Buffer.from(JSON.stringify(out)).toString("base64"));
    }

    let decodedPack;
    try {
      decodedPack = JSON.parse(Buffer.from(tok, "base64").toString("utf8"));
    } catch (e) {
      decodedPack = null;
    }

    let username = null;
    let password = null;
    let tok_hk = null;

    if (decodedPack) {
      tok_hk = decodedPack.Tok_hk;

      if (decodedPack.Dados_hk) {
        const raw = Buffer.from(decodedPack.Dados_hk, "base64");

        if (XOR_KEY_HEX) {
          try {
            const key = Buffer.from(XOR_KEY_HEX, "hex");
            const plain = xorDecrypt(raw, key).toString("utf8");
            const obj = JSON.parse(plain);
            username = obj.username;
            password = obj.password;
          } catch (e) {}
        }
      }
    }

    let ok = false;
    if (ACCEPT_ANY) ok = true;
    if (tok_hk) ok = true;

    let responseInner;

    if (ok) {
      responseInner = {
        ConnectSt_hk: "HasBeenSucceeded",
        MessageFromSv: "Login OK",
        Logged_UserHK: username || "unknown",
        Logged_TokHK: tok_hk || "FAKE-TOKEN"
      };
    } else {
      responseInner = {
        ConnectSt_hk: "Failed",
        MessageFromSv: "User Invalido"
      };
    }

    const dados = Buffer.from(JSON.stringify(responseInner)).toString("base64");
    const out = {
      Dados_hk: dados,
      Sign_hk: hmacBase64(dados),
      Hash_hk: sha256HexUpper(dados)
    };

    const finalBase64 = Buffer.from(JSON.stringify(out)).toString("base64");

    return res.status(200).send(finalBase64);

  } catch (err) {
    return res.status(500).send("internal error");
  }
}
