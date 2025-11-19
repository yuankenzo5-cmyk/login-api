import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "token missing" });
  }

  // 1. Base64 decode token → JSON asli
  let tokenObj;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    tokenObj = JSON.parse(decoded);
  } catch (e) {
    return res.status(400).json({ error: "Invalid base64 token" });
  }

  // Data di dalam token
  const clientData = tokenObj.Data || "";
  const clientHash = tokenObj.Hash || "";

  // 2. Generate DATA (analogi fcn.00041400 / string building)
  const serverText = "Login Success " + Date.now();
  const encodedData = Buffer.from(serverText, "utf8").toString("base64");

  // 3. Generate HASH (mirip SHA-256 di PDG)
  const hash = crypto
    .createHash("sha256")
    .update(serverText)
    .digest("hex")
    .toUpperCase();

  // 4. Generate SIGN (random AES-like / PDG pakai table XOR)
  const randomSign = crypto.randomBytes(64).toString("hex").toUpperCase();

  // 5. Bentuk JSON response
  const responseObj = {
    Data: encodedData,
    Sign: randomSign,
    Hash: hash
  };

  // 6. Encode kembali ke BASE64 seperti apk
  const finalBase64 = Buffer.from(JSON.stringify(responseObj)).toString("base64");

  // Return persis seperti APK expect (STRING base64!)
  return res.status(200).send(finalBase64);
}
