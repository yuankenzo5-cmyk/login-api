export default async function handler(req, res) {
  console.log('🔥 Handler triggered');

  if (req.method !== 'POST') {
    return res.status(405).json({ Status: 'Failed', Message: 'Method not allowed' });
  }

  try {
    // Baca raw body
    let rawBody = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => (rawBody += chunk));
      req.on('end', resolve);
    });
    console.log('🧩 Raw body:', rawBody);

    // Parse form-urlencoded
    const params = new URLSearchParams(rawBody);
    const token = params.get('token');
    if (!token) {
      console.log('❌ No token found');
      return res.status(400).json({ Status: 'Failed', Message: 'Token missing' });
    }

    // Decode base64 token
    let decodedToken;
    try {
      decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      console.log('🔍 Decoded token:', decodedToken);
    } catch (e) {
      console.error('❌ Invalid base64 token');
      return res.status(400).json({ Status: 'Failed', Message: 'Invalid base64 token' });
    }

    // (Opsional) parse JSON di dalam token kalau memang JSON
    let tokenData;
    try {
      tokenData = JSON.parse(decodedToken);
    } catch {
      tokenData = { raw: decodedToken };
    }

    console.log('✅ Parsed token data:', tokenData);

    // Contoh validasi login
    const valid = tokenData.username === 'admin' && tokenData.password === '12345';

    const response = valid
      ? { Status: 'Success', Message: 'Login OK', SubcriptionLeft: '30' }
      : { Status: 'Failed', Message: 'Invalid credentials', SubcriptionLeft: '0' };

    // Encode seluruh respons ke base64 sebelum dikirim
    const encodedResponse = Buffer.from(JSON.stringify(response)).toString('base64');
    console.log('🚀 Final base64 response:', encodedResponse);

    res.status(200).send(encodedResponse);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ Status: 'Failed', Message: 'Server error' });
  }
                                  }
