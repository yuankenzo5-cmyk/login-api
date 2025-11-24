export const config = {
  api: {
    bodyParser: false   // disable parser so we read raw body
  }
};

const EXPECTED_TOK = "eyJEYWRvc19oayI6IkF0Y1ZCWjVFK1pJdjRHTGdhR1J2UVlzeDFaTnZqVUlKRE1HWmU1MVZXOFJlc3JkSkJPWlNtSUZcL0Ywd0pIZkxoakVHdHFiQkxZOVl3VDhnNGV4S3ZwZ3pzcFdhdXgySFJWc3Z1RW5uYnk3MTY5a3hacURoVzRQNTFQWkZBUmlRT3VvVzdlMFZOcDcyTkZ2OGhxbFBTekQyUEpYUEZKdmUzaVdreitTMVNwTE09IiwiSGFzaF9oayI6IjFGMUFDMjVEN0U4QzJFRTREQzc5NEQyNjg5MUMyRjE0RkU0NjAwOUQ3MDk1MzhFRjY4QUVBNzhDQjE3RDY2NDAiLCJUb2tfaGsiOiI4YjcxMmI0Ni1iYjdkLTQ0OGEtYTNjNi1kODY5NWExNzgzMmIifQ==";          // isi nanti
const RESPONSE_BASE64 = "eyJEYWRvc19oayI6Ik9SdHdYUzlYVlZwR2FqSnNLVk1UQ1JBQ1ZpaFpWQ0pnSFJjUFZrUkxKMUFoY0ROYUxoRTNGSDRXY2lkSlpTTkxRR2hCQ0FaWGRCTlJWa1J0UjNaMlVuTlZXbFlnRnhJVkVIdytReWhLVkhkVFBVUmpEeE4yWUIwWEEwTmNiaU5GTjE4dVd4d3FLaFIrRmdoc0FXYzciLCJTaWduX2hrIjoiTWJcL0swQjN2THU3SGpZS25sQnpjUEI2TXorK09YMndLQVNhZ2Rzb1wvc1F1UEhUQ3RFSkwwVnVFSE1Id3FtWU0xdDJWV1NnM0NCdHBpdmtzcFYrY3BqMTBNM2pxY0JHQWVnQjJnS0ZneDhrUVpzTXJPS3UrQ01GMDFBZUJnY2xIRUo1eGJ6a1wva3VTR2tJemEwQkZvR3ZCeVwvVVp5NUVaUjNPVGpNS1hINlVGQT0iLCJIYXNoX2hrIjoiQjkzMkE5MDkyOUYzQTgxMzJEN0E1MUZCMTVCMzc4RjdENkE1Q0JBNkQ0OUIwRUY4NDQ0ODYyRTM4ODIxMkZGNyJ9";    // isi nanti

function parseUrlEncoded(str) {
  return Object.fromEntries(
    str.split("&").map(x => x.split("=").map(decodeURIComponent))
  );
}

function fail() {
  const inner = { ConnectSt_hk: "Failed", MessageFromSv: "User Invalido" };
  const dados = Buffer.from(JSON.stringify(inner)).toString("base64");
  const hash = require("crypto").createHash("sha256").update(dados).digest("hex").toUpperCase();
  const sign = require("crypto").createHmac("sha256", "fallback").update(dados).digest("base64");
  const outer = { Dados_hk: dados, Sign_hk: sign, Hash_hk: hash };
  return Buffer.from(JSON.stringify(outer)).toString("base64");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).send("Method Not Allowed");
    }

    const raw = await new Promise(resolve => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => resolve(data));
    });

    const body = parseUrlEncoded(raw || "");

    const tok = body.tokserver_hk || body.tok || null;
    if (!tok) return res.status(200).send(fail());

    if (tok === EXPECTED_TOK) {
      return res.status(200).send(RESPONSE_BASE64);
    }

    return res.status(200).send(fail());
  } catch (e) {
    console.error(e);
    return res.status(500).send(fail());
  }
  }
