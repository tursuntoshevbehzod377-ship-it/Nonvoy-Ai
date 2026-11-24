export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ reply: "Faqat POST" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body.message || "";
    const history = body.history || [];
    if (!message) return res.status(200).json({ reply: "Salom! Nima yordam beray?" });

    const messages = [
      { role: "system", content: "Sen Nonvoy AI san. Faqat oddiy o'zbekcha matn bilan javob ber. Hech qachon ASCII rasm, kod blok, ``` ishlatma. Qisqa, samimiy, tushunarli javob ber." },
      ...history.slice(-6),
      { role: "user", content: message }
    ];

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: messages,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await r.json();
    if (!r.ok) {
      console.log("GROQ XATO:", data);
      return res.status(200).json({ reply: "Hozir server band, birozdan keyin qayta urinib ko'ring." });
    }
    const reply = data.choices?.[0]?.message?.content || "Salom! Qanday yordam beray?";
    return res.status(200).json({ reply: reply });
  } catch (e) {
    console.log("SERVER XATO:", e);
    return res.status(200).json({ reply: "Hozir server band, birozdan keyin qayta urinib ko'ring." });
  }
}
