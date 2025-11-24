import qs from "querystring";

export default function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ MessageFromSv: "Método inválido" });
    }

    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
        const parsed = qs.parse(body);
        const encoded = parsed.tokserver_hk;

        if (!encoded) {
            return res.status(400).json({ MessageFromSv: "Insira seus dados" });
        }

        let data;
        try {
            data = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
        } catch (e) {
            return res.status(400).json({ MessageFromSv: "Erro no formato" });
        }

        const key = data.key || data.Key || data.password;

        // Sesuaikan dengan key benar
        const validKey = "123456";

        if (key !== validKey) {
            return res.status(200).json({
                MessageFromSv: "Dados Incorretos"
            });
        }

        // Jika benar
        return res.status(200).json({
            Dados_hk: "DADOS_ENCRYPT_RESULT",
            Hash_hk: "HASH_RESULT",
            Sign_hk: "SIGN_RESULT",
            MessageFromSv: "Login efetuado com sucesso"
        });
    });
}
