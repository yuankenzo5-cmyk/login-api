import crypto from "crypto";

export async function POST(request) {
  try {
    // Ambil body: token=xxxxxxxxx
    const raw = await request.text();

    // Format form-urlencoded → ambil setelah "token="
    const token = raw.startsWith("token=")
      ? raw.substring(6)
      : null;

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    // ---- LOGIC SESUAI APK ----

    // 1. Decode base64 token → dapat JSON
    const decodedJSON = Buffer.from(token, "base64").toString("utf8");

    // 2. Data random untuk respon
    const serverData = {
      Data: generateEncryptedData(),
      Sign: generateHex(512),
      Hash: "" // diisi setelah hitung SHA256
    };

    // 3. Hash = SHA256(data sebelum base64)
    const plainData = JSON.stringify(serverData.Data);
    const hashHex = crypto.createHash("sha256").update(plainData).digest("hex");

    serverData.Hash = hashHex;

    // 4. Encode final response JSON → base64 seperti APK
    const finalPayload = {
      Data: Buffer.from(JSON.stringify(serverData)).toString("base64"),
      Sign: generateHex(512),
      Hash: hashHex
    };

    return new Response(JSON.stringify(finalPayload), {
      status: 200,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

  } catch (err) {
    return new Response("ERR: " + err.message, { status: 500 });
  }
}

// ─── Helper ───────────────────────────────────────

function generateHex(bits = 256) {
  const bytes = bits / 8;
  return crypto.randomBytes(bytes).toString("hex");
}

function generateEncryptedData() {
  const payload = {
    Data: generateHex(128),
    HasH: generateHex(128)
  };
  return payload;
                                                                         }
