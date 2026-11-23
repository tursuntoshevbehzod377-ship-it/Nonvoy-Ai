module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Faqat POST so‘rovi mumkin"
    });
  }

  try {
    const { message, history = [] } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Xabar bo‘sh"
      });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Groq API kaliti topilmadi"
      });
    }

    const messages = [
      {
        role: "system",
        content: "Sen Nonvoy AI nomli aqlli yordamchisan. O‘zbek tilida javob ber. Javoblaring foydali, aniq va tushunarli bo‘lsin."
      }
    ];

    if (Array.isArray(history)) {
      history.forEach(item => {
        if (
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string" &&
          item.content.trim()
        ) {
          messages.push({
            role: item.role,
            content: item.content
          });
        }
      });
    }

    messages.push({
      role: "user",
      content: message
    });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Groq API xatosi"
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    return res.status(200).json({
      reply: reply || "Javob olinmadi"
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server xatosi"
    });
  }
};
