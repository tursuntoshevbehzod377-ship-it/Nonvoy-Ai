export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Faqat POST so'rovi mumkin" });
  }

  try {
    const { message, messages, image, mode } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        reply: "GEMINI_API_KEY kaliti Vercel'da topilmadi."
      });
    }

    const text =
      message ||
      (Array.isArray(messages)
        ? messages[messages.length - 1]?.content
        : "") ||
      "";

    // RASM YARATISH
    const wantImage =
      mode === "image" ||
      /rasm yarat|rasm chiz|rasm yas|surat yarat/i.test(text);

    if (wantImage && !image) {
      const prompt = encodeURIComponent(
        text + ", highly detailed, photorealistic, sharp focus, professional quality"
      );

      const imageUrl =
        "https://image.pollinations.ai/prompt/" +
        prompt +
        "?width=1024&height=1024&nologo=true&model=flux";

      return res.status(200).json({
        reply: "Rasm tayyor:\n" + imageUrl,
        imageUrl
      });
    }

    // GEMINI UCHUN SO'ROV
    const parts = [];

    if (image) {
      let base64 = image;
      let mimeType = "image/jpeg";

      if (image.startsWith("data:")) {
        const match = image.match(/^data:(.*?);base64,(.*)$/);

        if (match) {
          mimeType = match[1];
          base64 = match[2];
        }
      }

      parts.push({
        inlineData: {
          mimeType,
          data: base64
        }
      });

      parts.push({
        text:
          "Bu rasmni diqqat bilan tahlil qil. " +
          "Undagi narsalarni aniq tasvirla. " +
          "Agar bilmasang, taxmin qilma. " +
          "O'zbek tilida javob ber. Savol: " +
          text
      });
    } else {
      parts.push({
        text:
          "Sen Nonvoy AI yordamchisisan. " +
          "O'zbek tilida aniq va tushunarli javob ber.\n\n" +
          text
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        reply: "Gemini xatosi: " +
          (data.error?.message || "So'rov bajarilmadi")
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") ||
      "Kechirasiz, javob olinmadi.";

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({
      reply: "Xatolik yuz berdi: " + error.message
    });
  }
}
