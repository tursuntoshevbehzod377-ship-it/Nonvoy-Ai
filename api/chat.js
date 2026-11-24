export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { message, image, mode } = req.body || {};
    const text = (message || '').toString().trim();
    const lower = text.toLowerCase();
    const GROQ = process.env.GROQ_API_KEY;
    const GEMINI = process.env.GEMINI_API_KEY;

    // 1. RASM KELSA - FAQAT TAHLIL
    if (image) {
      const b64 = image.includes(',') ? image.split(',')[1] : image;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `O'zbek tilida javob ber. Rasm chizma. Faqat rasmda nima borligini ayt. Savol: ${text}` }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }] })
      });
      const d = await r.json();
      const ans = d?.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
      return res.status(200).json({ reply: ans || ('Gemini xatosi: ' + (d?.error?.message || 'kalitni tekshir')) });
    }

    // 2. RASM CHIZISH
    if (mode === 'image' || /rasm chiz|chizib ber|rasm yarat/i.test(lower)) {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(text + ', beautiful, cinematic, sharp')}?width=1024&height=1024&seed=${Date.now()}&nologo=true`;
      return res.status(200).json({ reply: 'Mana rasming:', imageUrl: url });
    }

    // 3. MATN - AVVAL GROQ
    if (GROQ) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${GROQ}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: `Sen Nonvoy AI san. O'zbek tilida javob ber.` }, { role: 'user', content: text }] })
      });
      const d = await r.json();
      if (d?.choices?.[0]?.message?.content) return res.status(200).json({ reply: d.choices[0].message.content });
    }

    // 4. MATN - KEYIN GEMINI
    const r2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
    });
    const d2 = await r2.json();
    const ans2 = d2?.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
    return res.status(200).json({ reply: ans2 || ('Gemini xatosi: ' + (d2?.error?.message || 'kalitni tekshir')) });
  } catch (e) {
    return res.status(200).json({ reply: 'Xato: ' + e.message });
  }
  }
