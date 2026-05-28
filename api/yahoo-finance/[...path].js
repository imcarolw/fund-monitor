export default async function handler(req, res) {
  // req.query.path is an array of path segments from [...path]
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);

  // Rebuild query string, excluding the internal 'path' param Vercel injects
  const query = { ...req.query };
  delete query.path;
  const qs = Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : '';

  const url = `https://query1.finance.yahoo.com/${segments.join('/')}${qs}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
}
