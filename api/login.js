import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  // verifikasi login
  if (username === "brmod" && password === "123") {
    // ambil loader.zip dari folder yang sama
    const filePath = path.join(process.cwd(), "api", "loader.zip");
    const fileData = fs.readFileSync(filePath);
    const loaderBase64 = fileData.toString("base64");

    const response = {
      Status: "Success",
      Loader: loaderBase64,
      MessageString: {
        Cliente: username,
        Dias: "5"
      },
      CurrUser: username,
      CurrPass: password,
      CurrToken: "",
      CurrVersion: "2.0",
      SubscriptionLeft: "5"
    };

    return res.status(200).json(response);
  } else {
    return res.status(401).json({ Status: "Failed", Message: "Invalid login" });
  }
      }
