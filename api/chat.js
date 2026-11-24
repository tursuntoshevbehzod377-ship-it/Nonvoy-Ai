// api/chat.js - Nonvoy AI - FAQAT OpenRouter, Groq YO'Q
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Faqat POST' });

  try {
    const { message, image } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY topilmadi. Vercel > Settings > Environment Variables da tekshiring.' });
    }

    // 1. RASM TAHLILI - rasm yuborilgan bo'lsa
    if (image) {
      const userText = (message || '').trim() || 'Bu rasmda nima bor? Ozbek tilida batafsil tushuntir.';
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nonvoy-ai.vercel.app',
          'X-Title': 'Nonvoy AI'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen Nonvoy AI san. Faqat OZBEK tilida javob ber. Rasmda ko\'rgan narsangni aniq ayt. Ko\'rmagan narsani o\'ylab topma. Agar non bo\'lsa - qanday non, rangi, shakli, naqshi qandayligini ayt. Umumiy "rasm juda chiroyli" dema.' },
            { role: 'user', content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: image } }
            ]}
          ],
          max_tokens: 800,
          temperature: 0.3
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ error: 'Rasm tahlili xatosi: ' + (data?.error?.message || 'Server xatosi') });
      return res.status(200).json({ reply: data.choices[0].message.content, type: 'vision' });
    }

    // 2. ODDIY MATN / SHER
    const text = (message || '').trim();
    if (!text) return res.status(400).json({ error: 'Xabar bo\'sh' });

    const isPoem = /sher|she\'r|ona haqida/i.test(text);

    const r2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nonvoy-ai.vercel.app',
        'X-Title': 'Nonvoy AI'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: isPoem
            ? 'Sen o\'zbek shoirisan. Faqat OZBEK tilida yoz. Sher 4 band, har bandda 4 qator bo\'lsin. Qofiya mos, mazmuni bog\'liq bo\'lsin. Ruscha va inglizcha so\'z qo\'shma.'
            : 'Sen Nonvoy AI san. Faqat OZBEK tilida, qisqa, tushunarli, samimiy javob ber. Ruscha yozma.' },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        temperature: isPoem ? 0.7 : 0.5
      })
    });
    const data2 = await r2.json();
    if (!r2.ok) return res.status(500).json({ error: 'Xato: ' + (data2?.error?.message || 'Server xatosi') });
    return res.status(200).json({ reply: data2.choices[0].message.content, type: 'text' });

  } catch (e) {
    return res.status(500).json({ error: 'Server xatosi: ' + e.message });
  }
            }
