import express from "express";
import axios from "axios";
import { GoogleGenAI, Type } from "@google/genai";

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
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "代理转发失败", details: error.message });
    }
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

app.post("/api/agent/chat", async (req, res) => {
  try {
    const { messages, currentParams, hasImage } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key 未配置" });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert tableware product photography and scene setup AI assistant.
Your goal is to converse with the user and help them design the perfect product scene.
You are extremely smart, friendly, and you truly understand the user's intent.

The available parameter values are:
Styles:
- elegant_blue: 清雅雅致 (clean white surface with a light blue placemat, light blue vase)
- rustic: 复古厨房 (rustic kitchen with wooden textures and warm natural lighting)
- elegant_marble: 优雅大理石 (elegant warm beige marble round table, sheer curtains with dappled sunlight)
- cozy: 温馨早餐 (cozy breakfast setting with bright morning light and soft linen textures)
- forest: 森林时光 (outdoor forest setting, rustic wooden table with pine cones)
- sunny_home: 暖阳餐桌 (warm sunny dining setting with blurred background cabinet)
- spring_bamboo: 春日竹影 (light green background with bamboo leaf shadows, fresh feel)
- vintage_floral: 复古法式 (brown tablecloth, classic painting background, candles, roses)

Aspect Ratios (比例): "1:1", "3:4", "4:3", "9:16", "16:9"
Resolutions (清晰度): "1k", "2k", "4k"

Current system state parameters before user's message:
- selectedStyleId: "${currentParams?.selectedStyleId || 'elegant_blue'}"
- aspectRatio: "${currentParams?.aspectRatio || '1:1'}"
- resolution: "${currentParams?.resolution || '1k'}"
- customPrompt: "${currentParams?.customPrompt || ''}"
- original image uploaded: ${hasImage ? "Yes" : "No"}

Rules for updating params:
1. ONLY update parameters that the user explicitly wants to change.
2. If the user describes a scene, mood, or background that doesn't exactly match one of the predefined "Styles", you MUST put that description into the "customPrompt" field. For example, if they say "放在海滩上", set customPrompt to "on a sunny beach with white sand".
3. If the user specifies any addition or details (e.g. "加几朵白色的雏菊"), write/append this into the "customPrompt" field.
4. Decide if we should trigger image generation ("triggerGenerate"):
   - Set "triggerGenerate" to true if the user has already uploaded an original image (hasImage is true) AND they either ask to generate OR they described a specific visual change (style, customPrompt, or addition) that represents their "real need". 
   - If hasImage is false, always set "triggerGenerate" to false, and remind them to upload an image first.

You must output a valid JSON conforming exactly to the response schema. Keep the 'reply' friendly, concise, natural, and entirely in professional, helpful Chinese. Don't be dry.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: JSON.stringify(messages),
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "A friendly and concise conversational reply in Chinese explaining what was updated, or guiding them."
            },
            updatedParams: {
              type: Type.OBJECT,
              properties: {
                selectedStyleId: { type: Type.STRING },
                aspectRatio: { type: Type.STRING },
                resolution: { type: Type.STRING },
                customPrompt: { type: Type.STRING }
              }
            },
            triggerGenerate: {
              type: Type.BOOLEAN,
              description: "Whether we should trigger image generation now."
            }
          },
          required: ["reply", "triggerGenerate"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Agent chat error:", error);
    res.status(500).json({ error: "Failed to process agent message" });
  }
});

export default app;
