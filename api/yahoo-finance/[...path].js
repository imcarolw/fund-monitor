export default async function handler(req, res) {
  const path = req.url.replace(/^\/api\/yahoo-finance/, '');
  const url = `https://query1.finance.yahoo.com${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
