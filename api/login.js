// api/login.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
      extended: true
    }
  }
};

/*
  Replace the values below with the exact strings you captured.
  - EXPECTED_TOK: the tokserver_hk value APK sends (base64) -- exact match
  - RESPONSE_BASE64: the base64 response you captured from the real server (outer JSON base64)
*/

const EXPECTED_TOK = "eyJEYWRvc19oayI6IkF0Y1ZCWjVFK1pJdjRHTGdhR1J2UVlzeDFaTnZqVUlKRE1HWmU1MVZXOFJlc3JkSkJPWlNtSUZcL0Ywd0pIZkxoakVHdHFiQkxZOVl3VDhnNGV4S3ZwZ3pzcFdhdXgySFJWc3Z1RW5uYnk3MTY5a3hacURoVzRQNTFQWkZBUmlRT3VvVzdlMFZOcDcyTkZ2OGhxbFBTekQyUEpYUEZKdmUzaVdreitTMVNwTE09IiwiSGFzaF9oayI6IjFGMUFDMjVEN0U4QzJFRTREQzc5NEQyNjg5MUMyRjE0RkU0NjAwOUQ3MDk1MzhFRjY4QUVBNzhDQjE3RDY2NDAiLCJUb2tfaGsiOiI4YjcxMmI0Ni1iYjdkLTQ0OGEtYTNjNi1kODY5NWExNzgzMmIifQ=="; // <-- REPLACE with the full tokserver_hk you captured
const RESPONSE_BASE64 = "eyJEYWRvc19oayI6Ik9SdHdYUzlYVlZwR2FqSnNLVk1UQ1JBQ1ZpaFpWQ0pnSFJjUFZrUkxKMUFoY0ROYUxoRTNGSDRXY2lkSlpTTkxRR2hCQ0FaWGRCTlJWa1J0UjNaMlVuTlZXbFlnRnhJVkVIdytReWhLVkhkVFBVUmpEeE4yWUIwWEEwTmNiaU5GTjE4dVd4d3FLaFIrRmdoc0FXYzciLCJTaWduX2hrIjoiTWJcL0swQjN2THU3SGpZS25sQnpjUEI2TXorK09YMndLQVNhZ2Rzb1wvc1F1UEhUQ3RFSkwwVnVFSE1Id3FtWU0xdDJWV1NnM0NCdHBpdmtzcFYrY3BqMTBNM2pxY0JHQWVnQjJnS0ZneDhrUVpzTXJPS3UrQ01GMDFBZUJnY2xIRUo1eGJ6a1wva3VTR2tJemEwQkZvR3ZCeVwvVVp5NUVaUjNPVGpNS1hINlVGQT0iLCJIYXNoX2hrIjoiQjkzMkE5MDkyOUYzQTgxMzJEN0E1MUZCMTVCMzc4RjdENkE1Q0JBNkQ0OUIwRUY4NDQ0ODYyRTM4ODIxMkZGNyJ9"; // <-- REPLACE with the full outer response base64 you captured

// A generic fail "outer" (base64 of {"Dados_hk": "<base64FailedJson>", ...})
function buildFailBase64() {
  const failInner = { ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" };
  const dados = Buffer.from(JSON.stringify(failInner), "utf8").toString("base64");
  const hash = require("crypto").createHash("sha256").update(dados).digest("hex").toUpperCase();
  const sign = require("crypto").createHmac("sha256", "fallback").update(dados).digest("base64");
  const outer = { Dados_hk: dados, Sign_hk: sign, Hash_hk: hash };
  return Buffer.from(JSON.stringify(outer), "utf8").toString("base64");
}

export default function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).send("Method Not Allowed");
    }

    // Vercel auto-parses urlencoded body into req.body
    const body = req.body || {};
    const tok = body.tokserver_hk || body.tok || body.tokServer_hk;

    if (!tok) {
      // missing token -> return fail (base64 outer)
      const fail = buildFailBase64();
      return res.status(200).type("text/plain").send(fail);
    }

    // If token exactly equals the one captured from APK -> return exact original server response (base64)
    if (tok === EXPECTED_TOK) {
      // Return EXACT base64 string that APK expects (outer JSON base64)
      return res.status(200).type("text/plain").send(RESPONSE_BASE64);
    }

    // Token mismatch -> return fail
    const fail = buildFailBase64();
    return res.status(200).type("text/plain").send(fail);

  } catch (err) {
    console.error("handler error:", err);
    return res.status(500).type("text/plain").send(buildFailBase64());
  }
}
