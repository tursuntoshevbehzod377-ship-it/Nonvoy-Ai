module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Faqat POST so'rovi mumkin" });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Xabar bo'sh" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API kaliti topilmadi. Vercel -> Settings -> Environment Variables ga GEMINI_API_KEY ni qo'shing" });
    }

    // To'g'ri ishlaydigan modellar ro'yxati - birinchisi ishlamasa keyingisiga o'tadi
    const MODELS = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ];

    // History ni tozalash - Gemini da birinchi xabar albatta "user" bo'lishi kerak
    let contents = history
      .filter(item => item.content && item.content.trim() !== "")
      .map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }]
      }));

    // Ketma-ket bir xil rollar bo'lsa tozalash
    contents = contents.filter((item, index) => {
      if (index === 0) return item.role === "user";
      return item.role !== contents[index - 1].role;
    });

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    let lastError = "";

    // Har bir modelni navbatma-navbat sinab ko'ramiz
    for (const model of MODELS) {
      // Har bir modelga 2 marta urinamiz
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents,
                systemInstruction: {
                  parts: [{ text: "Sen o'zbek tilida gaplashadigan foydali yordamchisan. Javoblaringni qisqa, tushunarli va o'zbek tilida ber." }]
                },
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2048,
                }
              })
            }
          );

          const data = await response.json();

          // Muvaffaqiyatli bo'lsa javobni qaytaramiz
          if (response.ok) {
            const reply = data.candidates?.[0]?.content?.parts
              ?.map(part => part.text || "")
              .join("") || "Javob olinmadi";
            return res.status(200).json({ reply });
          }

          lastError = data.error?.message || "Gemini xatoligi";

          // 429 = limit to'ldi, 503 = band. Bunday holda biroz kutib qayta urinamiz
          if (response.status === 429 || response.status === 503 || response.status === 500) {
            console.log(`${model} band, ${attempt}-urinish. Kutamiz...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // 2 sek, keyin 4 sek kutadi
            continue;
          } else {
            // Boshqa xatolik bo'lsa keyingi modelga o'tamiz
            break;
          }

        } catch (fetchError) {
          lastError = fetchError.message;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Hamma model ishlamasa foydalanuvchiga chiroyli xabar
    return res.status(503).json({
      error: "Hozir barcha modellar band. Iltimos 1 daqiqadan keyin qayta urinib ko'ring."
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Serverda kutilmagan xatolik: " + error.message });
  }
};
