/* ---------------------------------------------------------------------------
   api/send.js — Vercel serverless-функция.
   ----------------------------------------
   Принимает POST с JSON-телом:
     {
       profileJson: string,       // JSON-строка профиля для архива
       htmlReport:  string,       // HTML-страница отчёта
       attachments: [{ name, dataUrl }]  // прикреплённые PDF из формы
     }

   Шлёт письмо врачу через Resend (https://resend.com). Адреса задаются
   через переменные окружения Vercel:
     RESEND_API_KEY — API-ключ Resend
     DOCTOR_EMAIL   — куда отправлять письмо
     RESEND_FROM    — отправитель (по умолчанию onboarding@resend.dev)

   Body Vercel-функции по умолчанию ограничен 4.5 МБ. Если суммарный размер
   вложений превышает лимит, фронт получит 413 — попросит уменьшить файлы
   или прислать их отдельно.
   --------------------------------------------------------------------------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.DOCTOR_EMAIL;
  const fromEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';

  if (!apiKey || !toEmail) {
    return res.status(500).json({ error: 'Server not configured: RESEND_API_KEY or DOCTOR_EMAIL is missing' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { profileJson, htmlReport, attachments = [] } = body || {};
  if (!profileJson || !htmlReport) {
    return res.status(400).json({ error: 'profileJson and htmlReport are required' });
  }

  const dateStr = new Date().toISOString().slice(0, 10);

  // Собираем список вложений для Resend. Все base64.
  const resendAttachments = [
    { filename: `anamnesis-${dateStr}.json`, content: toBase64(profileJson) },
    { filename: `anamnesis-${dateStr}.html`, content: toBase64(htmlReport) }
  ];

  // PDF-вложения от пользователя (УТП, генетический тест).
  for (const att of attachments) {
    if (!att || !att.name || !att.dataUrl) continue;
    const base64 = att.dataUrl.split(',')[1]; // отрезаем 'data:application/pdf;base64,'
    if (!base64) continue;
    resendAttachments.push({ filename: att.name, content: base64 });
  }

  // Короткое тело письма + список приложенных файлов для удобства.
  const filesList = resendAttachments.map(a => `<li>${escapeHtml(a.filename)}</li>`).join('');
  const html = `
    <p>Новый анамнез спортсмена. Все материалы — во вложении.</p>
    <p><b>Файлы:</b></p>
    <ul>${filesList}</ul>
    <p style="color:#94A3B8;font-size:12px">Отправлено автоматически из формы анамнеза.</p>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: `Новый анамнез — ${dateStr}`,
        html,
        attachments: resendAttachments
      })
    });

    if (!resendRes.ok) {
      const text = await resendRes.text();
      return res.status(502).json({ error: 'Resend rejected the request', detail: text });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Network error', detail: String(e) });
  }
}

function toBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
