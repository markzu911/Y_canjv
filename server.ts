import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  app.post("/api/gemini", async (req, res) => {
    try {
      const model = req.body.model || 'gemini-3.1-flash-image';
      const payload = req.body.payload || req.body;
      const { imageBase64, style, aspectRatio, resolution, customPrompt } = payload;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "API Key 未配置" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const customRequirement = customPrompt ? `\n\nUSER'S CUSTOM INSTRUCTIONS (MUST FOLLOW): ${customPrompt}` : '';
      
      const prompt = `CRITICAL INSTRUCTION: You are an expert e-commerce image editor. Your task is to change the background of the provided image. 
      
ABSOLUTE RULE: You MUST preserve the EXACT SAME tableware items, in the EXACT SAME QUANTITY, with the EXACT SAME details, shape, and color as the original image. DO NOT add any extra bowls, plates, cups, or utensils. DO NOT remove any items. You must keep the exact tableware set shown in the source image. 

Background to apply: ${style}. 

Shoot from an angled/oblique perspective. The new background must look highly professional, photorealistic, and seamlessly integrate the original tableware.${customRequirement}`;
      
      // Parse base64
      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]*;base64,/, "");

      const imageSize = resolution === "1k" ? "1K" : resolution === "2k" ? "2K" : "4K";

      const interaction = await ai.interactions.create({
        model: model,
        input: [
          {
            type: "image",
            data: base64Data,
            mime_type: mimeType
          },
          {
            type: "text",
            text: prompt
          }
        ],
        response_modalities: ['image'],
        generation_config: {
          image_config: {
            aspect_ratio: aspectRatio,
            image_size: imageSize
          }
        }
      });

      const extractImageUrl = (interaction: any) => {
        let url = null;
        for (const step of interaction.steps) {
          if (step.type === 'model_output') {
            const imageContent = step.content?.find((c: any) => c.type === 'image');
            if (imageContent && imageContent.data) {
              const outMimeType = imageContent.mime_type || 'image/png';
              url = `data:${outMimeType};base64,${imageContent.data}`;
              break;
            }
          }
        }
        return url;
      };

      const imageUrl = extractImageUrl(interaction);

      if (imageUrl) {
        res.json({ imageUrl });
      } else {
        console.error("No image data found in response");
        res.status(500).json({ error: "Failed to generate image" });
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/tool/launch", (req, res) => {
    res.json({
      success: true,
      data: {
        user: { name: "Test User", integral: 100 },
        tool: { name: "Image Gen", integral: 10 }
      }
    });
  });

  app.post("/api/tool/verify", (req, res) => {
    res.json({
      success: true,
      data: { currentIntegral: 100, requiredIntegral: 10 }
    });
  });

  app.post("/api/tool/consume", (req, res) => {
    res.json({
      success: true,
      data: { currentIntegral: 90, consumedIntegral: 10 }
    });
  });

  app.post("/api/upload/direct-token", (req, res) => {
    res.json({
      success: true,
      method: "PUT",
      uploadUrl: "/api/upload/proxy-put",
      objectKey: `result/test_${Date.now()}.png`,
      headers: { "Content-Type": req.body.mimeType || 'image/png' }
    });
  });

  app.put("/api/upload/proxy-put", (req, res) => {
    res.status(200).send();
  });

  app.post("/api/upload/commit", (req, res) => {
    res.json({
      success: true,
      savedToRecords: true,
      recordId: "img_test"
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
