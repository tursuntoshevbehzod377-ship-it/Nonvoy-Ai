export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ reply: "Faqat POST" });
  try {
    const { message, history, image } = req.body || {};
    const userMsg = (message || "").toString().trim();
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(200).json({ reply: "Salom! Men Nonvoy AI man." });

    // RASM TAHLILI - agar rasm kelgan bo'lsa
    if (image) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
              { role: "system", content: "Sen Nonvoy AI san. Rasmni o'zbek tilida tahlil qil. Nima ko'rinayotganini, rangini, holatini, kamchilik va yaxshi tomonlarini sodda, samimiy tilda ayt. Hech qachon kod yozma." },
              { role: "user", content: [
                { type: "text", text: userMsg || "Bu rasmni tahlil qilib ber. Nima ko'rinayapti?" },
                { type: "image_url", image_url: { url: image } }
              ]}
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });
        const data = await r.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) return res.status(200).json({ reply });
      } catch (e) {}
      return res.status(200).json({ reply: "Rasmingizni ko'rdim. Juda chiroyli ekan! Bu haqida batafsil yozib bering — masalan 'Bu non qanday chiqibdi?' deb so'rang." });
    }

    // ODDIY MATN
    if (!userMsg) return res.status(200).json({ reply: "Savol yozing." });
    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b"];
    for (const model of models) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "Sen Nonvoy AI san. O'zbek tilida, qisqa, samimiy, sodda javob ber. Hech qachon kod, ASCII rasm, markdown jadval yozma." },
              ...(Array.isArray(history) ? history.slice(-10) : []),
              { role: "user", content: userMsg }
            ],
            temperature: 0.7,
            max_tokens: 800
          })
        });
        const data = await r.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) return res.status(200).json({ reply });
      } catch (e) {}
    }
    return res.status(200).json({ reply: "Salom! Savolingizni tushundim. Yana bir bor yozib ko'ring." });
  } catch (e) {
    return res.status(200).json({ reply: "Salom! Men Nonvoy AI man. Qanday yordam beray?" });
  }
}
