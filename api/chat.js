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
      // Groq da hozir ishlaydigan vision modellar - tartib bilan urinadi
      const models = [
        "llama-3.2-90b-vision-preview",
        "llama-3.2-11b-vision-preview",
        "meta-llama/llama-4-scout-17b-16e-instruct"
      ];
      let lastError = "";
      for (const model of models) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: "Sen Nonvoy AI san. O'zbek tilida javob ber. Rasmda nima ko'rsang aniq ayt. Agar mashina bo'lsa: markasi, modeli, rangi, turi haqida ayt. Hech qachon 'rasm juda chiroyli' dema." },
                { role: "user", content: [{ type: "text", text: message }, { type: "image_url", image_url: { url: image } }] }
              ],
              max_tokens: 1000, temperature: 0.3
            })
          });
          const d = await r.json();
          if (d.choices && d.choices[0]) {
            return res.status(200).json({ reply: d.choices[0].message.content });
          }
          lastError = d.error?.message || "javob kelmadi";
        } catch (e) {
          lastError = e.message;
        }
      }
      return res.status(200).json({ reply: "RASM XATOSI: " + lastError });
    }

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
