import crypto from "crypto";

export async function POST(request) {
  try {
    const rawBody = await request.text();

    // Parse: token=xxxxx
    const token = rawBody.startsWith("token=")
      ? rawBody.substring(6)
      : null;

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    // Decode token dari APK (untuk parsing saja)
    const decodedToken = Buffer.from(token, "base64").toString("utf8");

    // Buat JSON seperti server aslinya
    const jsonObject = {
      Data: crypto.randomBytes(256).toString("base64"),
      Sign: crypto.randomBytes(128).toString("hex"),
      Hash: crypto.randomBytes(32).toString("hex")
    };

    // Encode JSON menjadi Base64 (format wajib APK)
    const base64Response = Buffer
      .from(JSON.stringify(jsonObject))
      .toString("base64");

    return new Response(base64Response, {
      status: 200,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

  } catch (e) {
    return new Response("ERR:" + e.message, { status: 500 });
  }
                        }
