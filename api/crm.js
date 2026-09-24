const { createClient } = require('redis');
const crypto = require('crypto');

function makeSessionToken(secret) {
  return crypto
    .createHmac('sha256', secret)
    .update('loviberi-crm-session')
    .digest('hex');
}

function getCookie(req, name) {
  const cookies = req.headers.cookie || '';

  const match = cookies
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(name + '='));

  if (!match) return null;

  return decodeURIComponent(
    match.substring(name.length + 1)
  );
}

let client;

async function getRedis() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', () => {});
    await client.connect();
  }
  return client;
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

  const secret = process.env.CRM_PASSWORD;

  if (!secret) {
    return res.status(500).json({
      error: 'CRM_PASSWORD not configured'
    });
  }

  const session = getCookie(req, 'crm_session');
  const expectedSession = makeSessionToken(secret);

  if (!session || session !== expectedSession) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const r = await getRedis();

    let cursor = '0';
    const keys = [];

    do {
      const result = await r.scan(cursor, {
        MATCH: 'loviberi:ticket:*',
        COUNT: 100
      });

      cursor = String(result.cursor);
      keys.push(...result.keys);
    } while (cursor !== '0');

    const guests = [];

    for (const key of keys) {
      const value = await r.get(key);

      if (value) {
        try {
          guests.push(JSON.parse(value));
        } catch (e) {}
      }
    }

    guests.sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const total = guests.length;
    const arrived = guests.filter(g => g.status === 'used').length;
    const waiting = guests.filter(g => g.status === 'active').length;

    const conversion =
      total > 0 ? Math.round((arrived / total) * 100) : 0;

    return res.status(200).json({
      stats: {
        total,
        arrived,
        waiting,
        conversion
      },
      guests
    });

  } catch (e) {
    return res.status(500).json({
      error: 'CRM error'
    });
  }
};
