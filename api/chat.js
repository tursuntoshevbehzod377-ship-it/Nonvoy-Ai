export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ reply: 'Faqat POST' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const message = body.message || "Bu rasmni tahlil qilib ber";
    const image = body.image || null;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(200).json({ reply: "XATO: GROQ_API_KEY topilmadi" });

    if (image) {
      // 1-urinish - Maverick
      let r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: [
            { role: "system", content: "Sen Nonvoy AI san. O'zbek tilida javob ber. Rasmda nima ko'rsang aniq ayt. Agar mashina bo'lsa: markasi, modeli, rangi, turi haqida ayt. Hech qachon 'rasm juda chiroyli' dema." },
            { role: "user", content: [{ type: "text", text: message }, { type: "image_url", image_url: { url: image } }] }
          ],
          max_tokens: 1000, temperature: 0.3
        })
      });
      let d = await r.json();
      if (d.choices && d.choices[0]) return res.status(200).json({ reply: d.choices[0].message.content });

      // 2-urinish - Scout, agar Maverick ishlamasa
      let r2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            { role: "system", content: "Sen Nonvoy AI san. O'zbek tilida javob ber. Rasmda nima ko'rsang aniq ayt. Mashina bo'lsa markasi va modelini ayt." },
            { role: "user", content: [{ type: "text", text: message }, { type: "image_url", image_url: { url: image } }] }
          ],
          max_tokens: 1000, temperature: 0.3
        })
      });
      let d2 = await r2.json();
      if (d2.choices && d2.choices[0]) return res.status(200).json({ reply: d2.choices[0].message.content });

      return res.status(200).json({ reply: "RASM XATOSI: " + (d.error?.message || d2.error?.message || "model rasmni ko'ra olmadi") });
    }

    // Oddiy matn
    const tr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: "Sen Nonvoy AI san. O'zbek tilida javob ber." }, { role: "user", content: message }],
        max_tokens: 800, temperature: 0.7
      })
    });
    const td = await tr.json();
    if (td.choices && td.choices[0]) return res.status(200).json({ reply: td.choices[0].message.content });
    return res.status(200).json({ reply: "MATN XATOSI: " + (td.error?.message || "javob kelmadi") });

  } catch (e) {
    return res.status(200).json({ reply: "SERVER XATOSI: " + e.message });
  }
        }
