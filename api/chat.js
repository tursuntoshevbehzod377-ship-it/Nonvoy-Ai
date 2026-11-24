export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ reply: 'Faqat POST' });

  try {
    const { message, history, image } = req.body || {};
    const userMsg = message || "Bu rasmni tahlil qilib ber";
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(200).json({ reply: "GROQ_API_KEY topilmadi. Vercel da tekshiring." });

    // RASM BOR BO'LSA - KO'RA OLADIGAN MODEL
    if (image) {
      const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: [
            {
              role: "system",
              content: "Sen Nonvoy AI san. O'zbek tilida javob ber. Rasmda nima ko'rsang - aniq ayt. Agar mashina bo'lsa: markasi, modeli, rangi, taxminiy yili, turi (sedan, SUV, sport...), o'ziga xos belgilari haqida ayt. Bilmasang - 'aniq bilmadim' de, lekin 'rasm juda chiroyli' deb qochma. Hech qachon 'rasm juda chiroyli' deb yozma."
            },
            {
              role: "user",
              content: [
                { type: "text", text: userMsg },
                { type: "image_url", image_url: { url: image } }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      const visionData = await visionRes.json();
      console.log("VISION:", JSON.stringify(visionData).slice(0, 500));

      if (visionData.choices && visionData.choices[0] && visionData.choices[0].message) {
        return res.status(200).json({ reply: visionData.choices[0].message.content });
      }

      // Agar vision ishlamasa - xatoni ko'rsatamiz, yolg'on gapirmaymiz
      return res.status(200).json({ reply: "Rasmni ko'ra olmadim. Yana bir bor yuborib ko'ring, iltimos. Xato: " + (visionData.error?.message || "noma'lum") });
    }

    // ODDIY MATN UCHUN - eski model
    const textRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "Sen Nonvoy AI san. O'zbek tilida, qisqa va aniq javob ber." },
          ...(history || []).slice(-10),
          { role: "user", content: userMsg }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    const textData = await textRes.json();
    if (textData.choices && textData.choices[0]) {
      return res.status(200).json({ reply: textData.choices[0].message.content });
    }
    return res.status(200).json({ reply: "Hozir javob bera olmadim. Qayta urinib ko'ring." });

  } catch (e) {
    console.log("CHAT ERROR:", e.message);
    return res.status(200).json({ reply: "Serverda xatolik. Bir ozdan keyin qayta urinib ko'ring." });
  }
        }
