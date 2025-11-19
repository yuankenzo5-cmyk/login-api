import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // =====================================================
    // 1. Ambil token dari body (apk kirim "token=xxx")
    // =====================================================
    const raw = req.body;
    const token = raw.replace("token=", "").trim();

    // =====================================================
    // 2. Decode token user (ini cuma contoh, optional)
    // =====================================================
    let decodedToken = "";
    try {
      decodedToken = Buffer.from(token, "base64").toString("utf8");
    } catch (e) {
      decodedToken = "INVALID_TOKEN";
    }

    // =====================================================
    // 3. Bikin Data / Sign / Hash EXACT seperti server asli
    // =====================================================

    // **ISI DARI RESPON ASLI – MASUKKAN DI SINI**
    const Data =
      "U21OalExaEZNVWNYQXhwM0lsZ29JMXhrSG1CMFZqRkdJbFZkWkVORldTOG1GUTFrRTBJeGFETUlBMUlIUWw1Y0Z5UmxiU3BGRURaY0xWQllFRnRaSjE0elFsSk5VR1VXR1J0clJDRkNKelJSTmtZclZsME9VQ1ZHR2cwSFNnPT0=";

    const Sign =
      "aVlKVjJQTUdlYU8zbE9QT29wS3BCNmpVR2djSHNyRGltWkVXQU9ONkFQNU0yZktiVTY0cHlxVXQ0RmFZdW5kYXM1VVdoNDJ1bUplNTRFaXEwb1dpWTZUc3ZvMUVYdnh6NWQxWnppUW9COFZsSWhEUHROSDl1Q0ZxSXdcL1pBYW5lUlJSMlhjNDNCRHRJeG14RzFkeFB4K1ZGbnQrVnFNb2x4OW5PMHRvZ3c1UElzQmdIUTZOZXFSV3FNNkdxR1VuYWVlZmoxV0NvSDRzUzB0b0U1RDBNdFdnSDlCQXFQYU1qQ1ltRHJEWVBVc2FPQ1BmaUs3WmUxRTc2bDFBd3Q4dzJkanBFeTVGK3JJdTVDNUlXMmxIbDJ5aWRyYmRcL2xQcExuSGZ2Z1FLMSt2Q1Q1Smc0bUJ5MUprN3VVcHYza0I2S1Z4TTQ5U2liVWdRcWc2eThGTWZYZ1RtQTFcL04xbld4WEthQjlvQStEclQ0SmJ3R2NjVjR6SkptVmV5VEtkVGNOZjlUUTZlK2pCeUpjcDBIM242UFpyRFV6aGkzOUlnakZQcURGc2drUnZkRlYrV095K3QrMStrTDRSZ2RTTHN4TjRyazNFanZqY20rSnFqZ3ZFU1lyWVpPbHBMZlV0blF1QlwvUHlaM2NmMXFpeGdTU0JMTzdlSVBoWkFOTmE3TjJrSEZrS09sZER0OWZnTGNmZUlqN29KSGY0ZXZLZ3c1dytRM0VcL1l1aUhBKzloUG1GZjdHY3dkRDI0NVFOOUhoRHJxaFQ1VDJEbjNYbVJHSjJjbGpqcnFFenEzbkwrRlQxNFhiK2w2YVpRVEYyWDVQWGN1Mm1vZnJnOFFJdkZhbXhPYURqTlZSS0tUV3FqNUU2c1BJMk8xdVwvSExWNjhvOGZrWVdjY0R3bEdRYmM9";

    const Hash = "1A0791D45981C1DF8F2B93B5C287770AA77FF14D4F83760737A9BE00E9C89027D";

    // =====================================================
    // 4. Bikin objek JSON seperti server asli
    // =====================================================
    const responseObject = {
      Data,
      Sign,
      Hash,
    };

    // =====================================================
    // 5. Encode lagi jadi base64 (format apk)
    // =====================================================
    const finalBase64 = Buffer.from(JSON.stringify(responseObject)).toString("base64");

    // =====================================================
    // 6. Kirim ke APK
    // =====================================================
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(finalBase64);
  } catch (e) {
    return res.status(500).send("SERVER ERROR: " + e.message);
  }
      }
