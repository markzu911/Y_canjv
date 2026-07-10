import express from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  next();
});

const proxyRequest = async (req: any, res: any, targetPath: string) => {
  const targetUrl = `http://aibigtree.com${targetPath}`;
  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { "Content-Type": "application/json" },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error("Proxy error:", error.message);
    res.status(500).json({ error: "代理转发失败" });
  }
};

app.post("/api/tool/launch", (req, res) => proxyRequest(req, res, "/api/tool/launch"));
app.post("/api/tool/verify", (req, res) => proxyRequest(req, res, "/api/tool/verify"));
app.post("/api/tool/consume", (req, res) => proxyRequest(req, res, "/api/tool/consume"));
app.post("/api/upload/direct-token", (req, res) => proxyRequest(req, res, "/api/upload/direct-token"));
app.post("/api/upload/commit", (req, res) => proxyRequest(req, res, "/api/upload/commit"));

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

export default app;
