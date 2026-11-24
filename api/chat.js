export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ reply: "Faqat POST" });

  try {
    const { message, history } = req.body || {};
    const userMsg = (message || "").toString().trim();
    if (!userMsg) return res.status(200).json({ reply: "Savol yozing." });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(200).json({ reply: "Salom! Men Nonvoy AI man. Qandaysiz? Sizga qanday yordam beray?" });

    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b"];
    let lastErr = "";

    for (const model of models) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "Sen Nonvoy AI san. O'zbek tilida, qisqa, samimiy, sodda javob ber. Hech qachon kod, ASCII rasm, markdown jadval yozma. Faqat oddiy matn." },
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
        lastErr = JSON.stringify(data).slice(0, 200);
      } catch (e) { lastErr = String(e).slice(0, 200); }
    }
    // Hamma model ishlamasa ham - bo'sh qaytarma, samimiy javob ber
    return res.status(200).json({ reply: "Salom! Men Nonvoy AI man. Savolingizni tushundim: " + userMsg + ". Hozir biroz bandman, lekin sizga albatta yordam beraman. Savolingizni biroz boshqacha qilib yozib ko'ring." });
  } catch (e) {
    return res.status(200).json({ reply: "Salom! Men Nonvoy AI man. Qanday yordam beray?" });
  }
    }
