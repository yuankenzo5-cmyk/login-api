import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  // Hanya izinkan POST
  if (req.method !== "POST") {
    return sendBase64(res, {
      Status: "Failed",
      Message: "Only POST method allowed",
    });
  }

  // Di Vercel, req.body sudah otomatis jadi objek
  const body = req.body;

  let body = req.body;

  // Parse manual kalau bukan JSON
  if (typeof body === "string") {
    try {
      body = Object.fromEntries(new URLSearchParams(body));
    } catch (e) {
      return sendBase64(res, {
        Status: "Failed",
        Message: "Invalid form data",
      });
    }
  }
  

  if (!body || !body.username || !body.password) {
    return sendBase64(res, {
      Status: "Failed",
      Message: "Invalid JSON body",
      SubscriptionLeft: "0"
    });
  }

  const { username, password } = body;
  
  // Kredensial yang benar
  const validUser = "brmod";
  const validPass = "123";

  if (username === validUser && password === validPass) {
    // Cek file loader.zip di root project
    const loaderpath = path.join(process.cwd(), "api", "nigga.zip");
    let loaderBase64 = "";
    if (fs.existsSync(loaderPath)) {
      loaderBase64 = fs.readFileSync(loaderPath).toString("base64");
    }

    const response = {
      Data: "Sm9obkRvZVZhbGlkQ29kZQ==",
      Sign: "U0lHTl9IRVJFX0VYQU1QTEU=",
      Hash: "A10791D45981C1DF8F2B93B5C287770AA77FF1D4F83760737A9BE00E9C89027D",
      Status: "Success",
      Loader: loaderBase64,
    };

    return sendBase64(res, response);
  }

  // Jika login salah
  return sendBase64(res, {
    Status: "Failed",
    MessageString: "Usuário e/ou senha incorreta!",
    SubscriptionLeft: "0"
  });
}

// Fungsi bantu untuk kirim Base64
function sendBase64(res, data) {
  const json = JSON.stringify(data);
  const base64 = Buffer.from(json).toString("base64");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(base64);
      }
