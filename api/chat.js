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

    // 1. RASM KELSA - FAQAT TAHLIL, GROQ BILAN
    if (image) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${GROQ}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `O'zbek tilida javob ber. Rasm chizma. Faqat rasmda nima borligini aniq ayt. Agar mashina bo'lsa marka, model, rang, yilni ayt. Savol: ${text || 'Bu rasmda nima bor?'}` },
              { type: 'image_url', image_url: { url: image } }
            ]
          }]
        })
      });
      const d = await r.json();
      const ans = d?.choices?.[0]?.message?.content;
      return res.status(200).json({ reply: ans || ('Groq xatosi: ' + (d?.error?.message || 'kalitni tekshir')) });
    }

    // 2. RASM CHIZISH
    if (mode === 'image' || /rasm chiz|chizib ber|rasm yarat/i.test(lower)) {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(text + ', beautiful, cinematic, sharp')}?width=1024&height=1024&seed=${Date.now()}&nologo=true`;
      return res.status(200).json({ reply: 'Mana rasming:', imageUrl: url });
    }

    // 3. MATN
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${GROQ}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages: [{ role: 'system', content: `Sen Nonvoy AI san. O'zbek tilida javob ber.` }, { role: 'user', content: text }] })
    });
    const d = await r.json();
    const ans = d?.choices?.[0]?.message?.content;
    return res.status(200).json({ reply: ans || ('Groq xatosi: ' + (d?.error?.message || 'kalitni tekshir')) });
  } catch (e) {
    return res.status(200).json({ reply: 'Xato: ' + e.message });
  }
}
