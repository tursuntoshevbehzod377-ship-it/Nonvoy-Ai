module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Faqat POST so'rovi mumkin"
    });
  }

  try {
    const { message, history = [] } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API kaliti topilmadi"
      });
    }

    const contents = history.map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }]
    }));

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        method: "POST",const response = await fetch(
  `URL`,
  {
    method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Gemini xatoligi"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "Javob olinmadi";

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
