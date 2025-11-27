export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const expected = {
    uid: "LKTEAM_V2",
    package: "com.santander.bbs",
    apk_hash: "e81bbe3d2827dff19200b7b25fe06e860c0b3ac12b97cb6e5640e1f470097832",
    apk_size: 4940115
  };

  const { uid, package: pkg, apk_hash, apk_size } = req.body || {};

  const valid =
    uid === expected.uid &&
    pkg === expected.package &&
    apk_hash === expected.apk_hash &&
    Number(apk_size) === expected.apk_size;

  return res.json({
    valid,
    ts: Math.floor(Date.now() / 1000)
  });
}
