export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt kerak" });
    }

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: prompt
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const image = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(image);

  } catch (error) {
    return res.status(500).json({
      error: "Rasm yaratishda xatolik",
      details: error.message
    });
  }
}
