export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    let raw = req.body;

    // ================================================
    // 1. FIX: pastikan body selalu string
    // ================================================
    if (typeof raw === "object") {
      // Vercel sering kirim { token: "xxx" }
      if (raw.token) raw = "token=" + raw.token;
      else raw = JSON.stringify(raw);
    } else if (Buffer.isBuffer(raw)) {
      raw = raw.toString("utf8");
    } else if (raw == null) {
      raw = "";
    }

    // ================================================
    // 2. Ambil token dari "token=xxxxx"
    // ================================================
    let token = "";

    if (raw.startsWith("token=")) {
      token = raw.substring(6).trim();
    }

    // ================================================
    // 3. DATA ASLI (yang kamu kirim sebelumnya)
    // ================================================
    const Data =
      "U21OalExaEZNVWNYQXhwM0lsZ29JMXhrSG1CMFZqRkdJbFZkWkVORldTOG1GUTFrRTBJeGFETUlBMUlIUWw1Y0Z5UmxiU3BGRURaY0xWQllFRnRaSjE0elFsSk5VR1VXR1J0clJDRkNKelJSTmtZclZsME9VQ1ZHR2cwSFNnPT0=";

    const Sign =
      "aVlKVjJQTUdlYU8zbE9QT29wS3BCNmpVR2djSHNyRGltWkVXQU9ONkFQNU0yZktiVTY0cHlxVXQ0RmFZdW5kYXM1VVdoNDJ1bUplNTRFaXEwb1dpWTZUc3ZvMUVYdnh6NWQxWnppUW9COFZsSWhEUHROSDl1Q0ZxSXdcL1pBYW5lUlJSMlhjNDNCRHRJeG14RzFkeFB4K1ZGbnQrVnFNb2x4OW5PMHRvZ3c1UElzQmdIUTZOZXFSV3FNNkdxR1VuYWVlZmoxV0NvSDRzUzB0b0U1RDBNdFdnSDlCQXFQYU1qQ1ltRHJEWVBVc2FPQ1BmaUs3WmUxRTc2bDFBd3Q4dzJkanBFeTVGK3JJdTVDNUlXMmxIbDJ5aWRyYmRcL2xQcExuSGZ2Z1FLMSt2Q1Q1Smc0bUJ5MUprN3VVcHYza0I2S1Z4TTQ5U2liVWdRcWc2eThGTWZYZ1RtQTFcL04xbld4WEthQjlvQStEclQ0SmJ3R2NjVjR6SkptVmV5VEtkVGNOZjlUUTZlK2pCeUpjcDBIM242UFpyRFV6aGkzOUlnakZQcURGc2drUnZkRlYrV095K3QrMStrTDRSZ2RTTHN4TjRyazNFanZqY20rSnFqZ3ZFU1lyWVpPbHBMZlV0blF1QlwvUHlaM2NmMXFpeGdTU0JMTzdlSVBoWkFOTmE3TjJrSEZrS09sZER0OWZnTGNmZUlqN29KSGY0ZXZLZ3c1dytRM0VcL1l1aUhBKzloUG1GZjdHY3dkRDI0NVFOOUhoRHJxaFQ1VDJEbjNYbVJHSjJjbGpqcnFFenEzbkwrRlQxNFhiK2w2YVpRVEYyWDVQWGN1Mm1vZnJnOFFJdkZhbXhPYURqTlZSS0tUV3FqNUU2c1BJMk8xdVwvSExWNjhvOGZrWVdjY0R3bEdRYmM9";

    const Hash =
      "1A0791D45981C1DF8F2B93B5C287770AA77FF14D4F83760737A9BE00E9C89027D";

    const json = { Data, Sign, Hash };

    // ================================================
    // 4. Encode ke base64 (APK WAJIB BASE64)
    // ================================================
    const encoded = Buffer.from(JSON.stringify(json)).toString("base64");

    // ================================================
    // 5. Kirim ke APK sebagai text/plain
    // ================================================
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(encoded);
  } catch (e) {
    return res.status(500).send("SERVER ERROR: " + e.message);
  }
}
