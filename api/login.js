module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false });
  }

  const { password } = req.body || {};

  if (!process.env.CRM_PASSWORD) {
    return res.status(500).json({
      ok: false,
      message: 'Пароль CRM не настроен'
    });
  }

  if (password !== process.env.CRM_PASSWORD) {
    return res.status(401).json({
      ok: false,
      message: 'Неверный пароль'
    });
  }

  return res.status(200).json({
    ok: true
  });
};
