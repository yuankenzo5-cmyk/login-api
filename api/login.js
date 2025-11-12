export const config = {
  runtime: "nodejs", // pastikan pakai Node.js runtime, bukan Edge
};

import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  // Pastikan POST
  if (req.method !== "POST") {
    return sendBase64(res, {
      Status: "Failed",
      Message: "Only POST method allowed",
    });
  }

  // Parsing body agar mendukung JSON dan x-www-form-urlencoded
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = Object.fromEntries(new URLSearchParams(body));
    } catch (err) {
      body = {};
    }
  }

  const username = body?.username;
  const password = body?.password;

  if (!username || !password) {
    return sendBase64(res, {
      Status: "Failed",
      Message: "Invalid JSON or form body",
      SubscriptionLeft: "0",
    });
  }

  // Kredensial benar
  const validUser = "brmod";
  const validPass = "123";

  if (username === validUser && password === validPass) {
    // Path file loader (ubah sesuai lokasi kamu)
    const loaderPath = path.join(process.cwd(), "api", "nigga.zip");

    let loaderBase64 = "";
    if (fs.existsSync(loaderPath)) {
      loaderBase64 = fs.readFileSync(loaderPath).toString("base64");
    }

    const response = {
      Data: "Sm9obkRvZXY=",
      Sign: "U0lHTlRPS0VORE8=",
      Hash: "QTIwMTk0NTk4MQ==",
      Status: "Success",
      Loader: loaderBase64,
    };

    return sendBase64(res, response);
  }

  // Jika gagal login
  return sendBase64(res, {
    Status: "Failed",
    MessageString: "Usuário e/ou senha incorreta!",
    SubscriptionLeft: "0"
  });
}

function sendBase64(res, obj) {
  const encoded = Buffer.from(JSON.stringify(obj)).toString("base64");
  res.status(200).send(encoded);
    }
