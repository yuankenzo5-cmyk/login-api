export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'Failed', message: 'Method not allowed' });
  }

  try {
    // 🔹 Log isi request ke Vercel (bisa dilihat di tab "Logs")
    console.log('Headers:', req.headers);
    console.log('Raw body:', req.body);

    // Pastikan body terisi
    if (!req.body) {
      return res.status(400).json({ status: 'Failed', message: 'Empty body' });
    }

    // Kalau pakai JSON body
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    console.log('Parsed body:', body);

    // Contoh validasi sederhana
    if (!body.username || !body.password) {
      return res.status(400).json({ status: 'Failed', message: 'Missing username or password' });
    }

    // Kalau lolos
    const response = {
      Status: 'Success',
      Message: 'Login OK',
      SubcriptionLeft: '30',
    };

    const encoded = Buffer.from(JSON.stringify(response)).toString('base64');
    return res.status(200).send(encoded);

  } catch (err) {
    console.error('Error:', err);
    return res.status(400).json({ status: 'Failed', message: 'Invalid JSON or form body' });
  }
}
