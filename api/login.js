const crypto = require('crypto');

function makeSessionToken(secret) {
  return crypto
    .createHmac('sha256', secret)
    .update('loviberi-crm-session')
    .digest('hex');
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false
    });
  }

  const { password } = req.body || {};
  const secret = process.env.CRM_PASSWORD;

  if (!secret) {
    return res.status(500).json({
      ok: false,
      message: 'Пароль CRM не настроен'
    });
  }

  if (password !== secret) {
    return res.status(401).json({
      ok: false,
      message: 'Неверный пароль'
    });
  }

  const token = makeSessionToken(secret);

  res.setHeader(
    'Set-Cookie',
    `crm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`
  );

  return res.status(200).json({
    ok: true
  });
};
