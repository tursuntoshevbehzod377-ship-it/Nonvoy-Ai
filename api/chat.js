export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Faqat POST' });

  try {
    const { message, messages, image, mode } = req.body || {};
    const text = (message || messages?.[messages.length - 1]?.content || '').toString().trim();
    const lower = text.toLowerCase();

    const GROQ_KEY = process.env.GROQ_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    // ===== 1-QOIDA: RASM YUBORILGAN BO'LSA — FAQAT TAHLIL =====
    // Bu eng birinchi tekshiriladi. Rasm bo'lsa, rasm chizish ishlamaydi.
    if (image) {
      if (!GEMINI_KEY) {
        return res.status(200).json({ reply: 'Rasm tahlili uchun GEMINI_API_KEY topilmadi. Vercel da kalitni tekshir.' });
      }
      const base64 = image.includes(',') ? image.split(',')[1] : image;
      const mime = image.startsWith('data:') ? image.split(';')[0].split(':')[1] : 'image/jpeg';

      const prompt = `Sen o'zbek tilida javob beradigan aqlli yordamchisan. Foydalanuvchi rasm yubordi.
Hech qachon rasm chizma, rasm yaratma, rasm haqida maqtov gapirma.
Faqat rasmda nimani ko'rayotganingni aniq ayt.

Foydalanuvchi savoli: ${text || 'Bu rasmda nima bor?'}

Agar mashina bo'lsa: marka, model, rang, taxminiy yilni ayt.
Agar odam, narsa, joy bo'lsa — uni aniq tasvirla.
Bilmasang "aniq bilmadim" de, uydirma.
Javobni o'zbek tilida, qisqa va aniq yoz.`;

      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: base64 } }] }]
        })
      });
      const gData = await gRes.json();
      const reply = gData?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || 'Rasmni o\'qib bo\'lmadi, yana bir bor yuborib ko\'r.';
      return res.status(200).json({ reply });
    }

    // ===== 2-QOIDA: RASM CHIZISH — FAQAT rasm yuborilmaganda =====
    const wantImage = mode === 'image' || /rasm chiz|rasm yas|chizib ber|rasm yarat|surat chiz|draw|image/i.test(lower);
    // "bu rasmda nima", "bu qanaqa mashina", "rasmni tahlil" deganlar — rasm chizish emas
    const isAskAboutImage = /bu rasm|bu surat|rasmda nima|rasmni|suratda/i.test(lower);
    if (wantImage && !isAskAboutImage) {
      const promptEn = encodeURIComponent(text + ', beautiful, cinematic, ultra sharp, high quality, detailed');
      const imageUrl = `https://image.pollinations.ai/prompt/${promptEn}?width=1024&height=1024&seed=${Date.now()}&nologo=true`;
      return res.status(200).json({ reply: 'Mana rasming:', imageUrl });
    }

    // ===== 3-QOIDA: ODDIY SUHBAT / SHE'R =====
    let systemPrompt = `Sen Nonvoy AI san. Har doim o'zbek tilida, chiroyli va tushunarli javob ber.`;
    if (/sher|she'r/i.test(lower)) {
      systemPrompt += ` She'r yozganda: qofiyali, chiroyli, tushunarli yoz. Har band 4 qatordan iborat bo'lsin. So'zlarni uzib tashlama, gapni oxirigacha yetkaz.`;
    }

    // Avval Groq, ishlamasa Gemini
    if (GROQ_KEY) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
            temperature: 0.7
          })
        });
        const d = await r.json();
        if (d?.choices?.[0]?.message?.content) {
          return res.status(200).json({ reply: d.choices[0].message.content });
        }
      } catch (e) {}
    }

    if (GEMINI_KEY) {
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + '\n\nFoydalanuvchi: ' + text }] }] })
      });
      const gData = await gRes.json();
      const reply = gData?.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
      if (reply) return res.status(200).json({ reply });
    }

    return res.status(200).json({ reply: 'Hozir barcha model band. Biroz kuting va yana urinib ko\'ring.' });
  } catch (e) {
    return res.status(200).json({ reply: 'Xatolik bo\'ldi: ' + e.message });
  }
                                                                 }
