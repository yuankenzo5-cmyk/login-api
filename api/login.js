export default async function handler(req, res) {
  let raw = "";
  req.on("data", chunk => raw += chunk.toString());
  await new Promise(r => req.on("end", r));

  const params = {};
  raw.split("&").forEach(p => {
    let [k, v] = p.split("=");
    params[k] = decodeURIComponent((v || "").replace(/\+/g, " "));
  });

  const key = params.key || params.tokserver_hk || "";

  // cek login (sesuaikan key yg kamu mau)
  const ok = key === "jslbbs";

  // inner json
  let inner;
  if (ok) {
    inner = {
      ConnectSt_hk: "HasBeenSucceeded",
      MessageFromSv: "Login OK",
      Logged_UserHK: "user001",
      Logged_TokHK: "token001"
    };
  } else {
    inner = {
      ConnectSt_hk: "Failed",
      MessageFromSv: "Dados Incorretos"
    };
  }

  const Dados_hk = Buffer.from(JSON.stringify(inner), "utf8").toString("base64");

  const outer = {
    Dados_hk: Dados_hk,
    Sign_hk: "OKSIGN",
    Hash_hk: "OKHASH"
  };

  const finalBody = Buffer.from(JSON.stringify(outer), "utf8").toString("base64");

  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(finalBody);
}
