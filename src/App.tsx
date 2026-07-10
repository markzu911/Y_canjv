import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2, Download, Maximize2, X, RefreshCw, Sparkles, Coffee, Gem, ChefHat, TreePine, Utensils, Gift, Lightbulb, CheckCircle2, Layout, Zap, Lock, User, Coins, Send, Bot, MessageSquare, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STYLES = [
  { id: 'elegant_blue', name: '清雅雅致', desc: '纯白桌面与浅蓝色餐布，点缀素雅花瓶与枯枝', icon: Sparkles, prompt: 'clean white surface with a light blue placemat, a minimalist light blue vase with dry bare branches, elegant silver cutlery placed neatly, bright and clean lighting, serene and elegant aesthetic' },
  { id: 'rustic', name: '复古厨房', desc: '木质纹理与温暖的自然光', icon: ChefHat, prompt: 'rustic kitchen with wooden textures and warm natural lighting' },
  { id: 'elegant_marble', name: '优雅大理石', desc: '暖色调大理石圆桌，柔和阳光透过薄纱窗帘，背景有极简挂画与收纳柜', icon: Gem, prompt: 'elegant warm beige marble round table in the foreground. Background features sheer white curtains with soft dappled sunlight filtering through, a minimalist beige art print framed in gold on the wall, and a wooden cabinet with a marble top. High-end, sophisticated, warm and serene interior design aesthetic, soft natural daylight.' },
  { id: 'cozy', name: '温馨早餐', desc: '明亮的晨光与柔软的亚麻质感', icon: Coffee, prompt: 'cozy breakfast setting with bright morning light and soft linen textures' },
  { id: 'forest', name: '森林时光', desc: '户外松林，木质长桌与蕾丝桌布，点缀松果与冷杉枝条', icon: TreePine, prompt: 'outdoor forest setting, rustic wooden table with a white lace tablecloth, decorated with pine cones and fir branches, natural dappled sunlight' },
  { id: 'sunny_home', name: '暖阳餐桌', desc: '温暖阳光，木质桌面与淡雅桌布，背景有虚化的收纳柜与花束，高级生活方式感', icon: Utensils, prompt: 'high-end lifestyle aesthetic, warm sunny indoor dining setting. The main tableware is the absolute focal point in sharp focus. The background features a wooden cabinet, soft flowers, and forks, but they are beautifully blurred out of focus (shallow depth of field/bokeh effect) to not distract. The table has a subtle, desaturated tablecloth. Beautiful warm golden hour dappled sunlight, elegant and premium cinematic photography' },
  { id: 'spring_bamboo', name: '春日竹影', desc: '浅绿背景与竹叶光影，点缀玻璃杯与马卡龙', icon: Gift, prompt: 'light pastel green background wall with dappled sunlight and bamboo leaf shadows, beige table surface. Decorated with an amber glass goblet, a textured glass vase with bamboo leaves, a white bubble candle, and small macarons. Fresh, playful, bright sunny lighting with distinct crisp shadows, spring aesthetic' },
  { id: 'vintage_floral', name: '复古法式', desc: '深棕色桌布，背景有复古油画、白蜡烛与粉色玫瑰', icon: Gem, prompt: 'elegant vintage french style, rich brown tablecloth. Background features a classic framed painting on the wall, a white candle in a holder, and pink roses in a glass vase. Vintage coffee grinder and gold cutlery as props. Warm, classical romantic cinematic lighting with rich textures.' }
];

const RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const RESOLUTIONS = ['1k', '2k', '4k'];

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  component?: 'style_picker' | 'upload_zone' | 'result_card';
  isError?: boolean;
  generatedImageUrl?: string;
  isGenerating?: boolean;
}

export default function App() {
  const [mode, setMode] = useState<'welcome' | 'agent' | 'expert'>('welcome');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '👋 您好！我是您的智能餐具商品场景设计师。我可以帮您定制高质感的餐具商品展示大片！\n\n您可以直接输入您想要的风格，比如 **“换成暖阳餐桌背景”** 或 **“比例改成16:9”**。\n\n让我们先从选择一个喜欢的预设背景风格开始，或者您直接上传餐具产品原图也可以。',
      component: 'style_picker'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const agentImageInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState(STYLES[0].id);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1k');
  const [customPrompt, setCustomPrompt] = useState('');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomPreview, setZoomPreview] = useState<string | null>(null);

  const [integral, setIntegral] = useState<number | null>(null);
  const [userId, setUserId] = useState<string>('test_user');
  const [toolId, setToolId] = useState<string>('test_tool');
  const [saasUrls, setSaasUrls] = useState<{verifyUrl?: string, consumeUrl?: string, uploadTokenUrl?: string, uploadCommitUrl?: string}>({});

  useEffect(() => {
    const fetchIntegral = async (uid: string, tid: string) => {
      try {
        const res = await fetch('/api/tool/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, toolId: tid })
        });
        const data = await res.json();
        if (data.success && data.data?.user) {
          setIntegral(data.data.user.integral);
        }
      } catch (err) {
        console.error('Fetch integral failed', err);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SAAS_INIT') {
        setUserId(event.data.userId);
        setToolId(event.data.toolId);
        setSaasUrls({
          verifyUrl: event.data.verifyUrl,
          consumeUrl: event.data.consumeUrl,
          uploadTokenUrl: event.data.uploadTokenUrl,
          uploadCommitUrl: event.data.uploadCommitUrl
        });
        fetchIntegral(event.data.userId, event.data.toolId);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Initial fetch for local development
    fetchIntegral(userId, toolId);

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isAgentTyping]);

  const processImageUpload = (base64: string) => {
    setUploadedImage(base64);
    setGeneratedImage(null);
    setError(null);

    if (mode === 'agent') {
      const userMsgId = `upload-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          text: '📸 [已上传原图] 成功导入了餐具产品图片。'
        }
      ]);
      triggerAgentResponse([
        ...messages,
        { role: 'user', text: '📸 [已上传原图] 成功导入了餐具产品图片。' }
      ], {
        selectedStyleId,
        aspectRatio,
        resolution,
        customPrompt
      }, base64);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        processImageUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeGeneration = async (
    img: string,
    styleId: string,
    ratio: string,
    resLabel: string,
    promptAddon: string
  ): Promise<string> => {
    // 1. Verify
    const verifyRes = await fetch('/api/tool/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, toolId })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      throw new Error(verifyData.message || verifyData.error || '余额不足拒绝生图');
    }

    // 2. Generate
    const stylePrompt = STYLES.find(s => s.id === styleId)?.prompt || 'clean background';
    const payload = {
      imageBase64: img,
      style: stylePrompt,
      aspectRatio: ratio,
      resolution: resLabel,
      customPrompt: promptAddon
    };

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.1-flash-image',
        payload,
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate image');
    }

    const genUrl = data.imageUrl;

    // 3. Consume & Upload in background
    try {
      const consumeRes = await fetch('/api/tool/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, toolId })
      });
      const consumeData = await consumeRes.json();
      if (consumeData.success && consumeData.data?.currentIntegral !== undefined) {
        setIntegral(consumeData.data.currentIntegral);
      }

      if (genUrl) {
        const imgRes = await fetch(genUrl);
        const blob = await imgRes.blob();
        
        const tokenRes = await fetch('/api/upload/direct-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            toolId,
            source: 'result',
            fileName: `generated-${Date.now()}.png`,
            mimeType: blob.type || 'image/png',
            fileSize: blob.size
          })
        });
        const tokenData = await tokenRes.json();
        if (tokenData.success) {
          await fetch(tokenData.uploadUrl || tokenData.ossUploadUrl, {
            method: tokenData.method || 'PUT',
            headers: tokenData.headers,
            body: blob
          });

          await fetch('/api/upload/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              toolId,
              source: 'result',
              objectKey: tokenData.objectKey,
              fileSize: blob.size
            })
          });
        }
      }
    } catch (err) {
      console.error('Consume or upload failed', err);
    }

    return genUrl;
  };

  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setIsGenerating(true);
    setError(null);
    try {
      const resultUrl = await executeGeneration(
        uploadedImage,
        selectedStyleId,
        aspectRatio,
        resolution,
        customPrompt
      );
      setGeneratedImage(resultUrl);
    } catch (err: any) {
      const errorMsg = err.message || '';
      if (errorMsg.includes('prepayment credits are depleted') || errorMsg.includes('429')) {
        setError('API 额度已用尽。请在 Google AI Studio 中检查并配置您的账单与额度。');
      } else {
        setError(errorMsg || '生成图片失败，请重试。');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerAgentResponse = async (
    history: Message[],
    params: { selectedStyleId: string; aspectRatio: string; resolution: string; customPrompt: string },
    imageToUse?: string | null
  ) => {
    setIsAgentTyping(true);

    try {
      const formattedMessages = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const activeImage = imageToUse !== undefined ? imageToUse : uploadedImage;

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedMessages,
          currentParams: params,
          hasImage: !!activeImage
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '智能助手分析失败');
      }

      // 1. Sync states dynamically
      if (data.updatedParams) {
        if (data.updatedParams.selectedStyleId) setSelectedStyleId(data.updatedParams.selectedStyleId);
        if (data.updatedParams.aspectRatio) setAspectRatio(data.updatedParams.aspectRatio);
        if (data.updatedParams.resolution) setResolution(data.updatedParams.resolution);
        if (data.updatedParams.customPrompt !== undefined) setCustomPrompt(data.updatedParams.customPrompt);
      }

      // 2. Reply message
      const agentMsgId = `agent-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: agentMsgId,
          role: 'model',
          text: data.reply
        }
      ]);

      // 3. Smart generation trigger
      if (data.triggerGenerate) {
        if (!activeImage) {
          setMessages(prev => [
            ...prev,
            {
              id: `no-img-${Date.now()}`,
              role: 'model',
              text: '⚠️ 请先上传餐具原图。您可以使用下方聊天工具栏的图片按钮进行上传哦！'
            }
          ]);
          return;
        }

        const loaderId = `gen-loader-${Date.now()}`;
        setMessages(prev => [
          ...prev,
          {
            id: loaderId,
            role: 'model',
            text: '✨ 智能生成中... 正为您融合自然光影并重新绘制背景，请稍候。',
            isGenerating: true
          }
        ]);

        try {
          const finalStyle = data.updatedParams?.selectedStyleId || params.selectedStyleId;
          const finalRatio = data.updatedParams?.aspectRatio || params.aspectRatio;
          const finalRes = data.updatedParams?.resolution || params.resolution;
          const finalPrompt = data.updatedParams?.customPrompt !== undefined ? data.updatedParams.customPrompt : params.customPrompt;

          const resultUrl = await executeGeneration(
            activeImage,
            finalStyle,
            finalRatio,
            finalRes,
            finalPrompt
          );

          setGeneratedImage(resultUrl);

          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== loaderId);
            return [
              ...filtered,
              {
                id: `result-${Date.now()}`,
                role: 'model',
                text: '🎉 您的餐具商品展示场景图已经完美生成啦！',
                component: 'result_card',
                generatedImageUrl: resultUrl
              }
            ];
          });
        } catch (genErr: any) {
          console.error(genErr);
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== loaderId);
            return [
              ...filtered,
              {
                id: `error-${Date.now()}`,
                role: 'model',
                text: `❌ 生图失败：${genErr.message || '系统繁忙，请重试'}`,
                isError: true
              }
            ];
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `❌ ${err.message || '网络连接或配置出现错误，请检查您的 API 配置。'}`,
          isError: true
        }
      ]);
    } finally {
      setIsAgentTyping(false);
    }
  };

  const handleSendChatMessage = (textToSend?: string) => {
    const targetText = textToSend !== undefined ? textToSend : inputMessage;
    if (!targetText.trim()) return;

    if (textToSend === undefined) {
      setInputMessage('');
    }

    const userMsgId = `user-${Date.now()}`;
    const updatedMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: targetText
      }
    ];

    setMessages(updatedMessages);

    triggerAgentResponse(updatedMessages, {
      selectedStyleId,
      aspectRatio,
      resolution,
      customPrompt
    });
  };

  const handleStyleSelectInChat = (styleId: string) => {
    const selectedStyle = STYLES.find(s => s.id === styleId);
    if (!selectedStyle) return;

    setSelectedStyleId(styleId);

    const userMsgId = `user-style-${Date.now()}`;
    const updatedMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: `🎨 选择了背景风格：${selectedStyle.name}`
      }
    ];

    setMessages(updatedMessages);

    triggerAgentResponse(updatedMessages, {
      selectedStyleId: styleId,
      aspectRatio,
      resolution,
      customPrompt
    });
  };

  return (
    <div className="h-screen bg-[#FAF8F5] text-[#4A3B32] font-sans selection:bg-[#EBDDC9] flex flex-col overflow-hidden">
      <header className="px-6 py-4 shrink-0 z-20">
        <div className="w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#EBDDC9] p-2.5 rounded-2xl text-[#4A3B32] shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#4A3B32]">餐具商品场景生成器</h1>
              <p className="text-xs text-[#888] mt-0.5">上传餐具图片，选择喜欢的背景风格，AI 为您生成高质感的商品场景图</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {mode !== 'welcome' && (
              <div className="flex items-center bg-[#EBE6E0]/40 p-1 rounded-full border border-[#EBE6E0]">
                <button
                  onClick={() => setMode('agent')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    mode === 'agent'
                      ? 'bg-[#4A3B32] text-white shadow-sm'
                      : 'text-[#665B54] hover:text-[#4A3B32]'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  智能助理
                </button>
                <button
                  onClick={() => setMode('expert')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    mode === 'expert'
                      ? 'bg-[#4A3B32] text-white shadow-sm'
                      : 'text-[#665B54] hover:text-[#4A3B32]'
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  专家模式
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-[#EBE6E0]">
              <Coins className="w-4 h-4 text-[#D4A373]" />
              <span className="text-sm font-bold text-[#4A3B32]">积分: {integral !== null ? integral : '--'}</span>
            </div>
            {mode !== 'welcome' && (
              <div className="hidden lg:flex items-center gap-3 bg-[#FDF8EE] border border-[#EBE6E0] px-4 py-2 rounded-xl">
                <Lightbulb className="w-4 h-4 text-[#D4A373]" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#4A3B32]">小贴士</span>
                  <span className="text-[10px] text-[#888]">选择合适的背景和光线，能让餐具更出彩哦~</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto w-full mx-auto px-4 pb-4 lg:px-6 lg:pb-6 flex ${
        mode === 'welcome' 
          ? 'flex-col items-center justify-center max-w-5xl' 
          : 'lg:overflow-hidden flex-col lg:flex-row gap-4 lg:gap-6'
      }`}>
        {mode === 'welcome' ? (
          <div className="w-full py-8 flex flex-col items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-2xl mb-12"
            >
              <div className="inline-flex items-center gap-1.5 bg-[#F5EFE6] px-4 py-1.5 rounded-full border border-[#D9C4A9] text-[#8A7969] text-xs font-bold mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                {"餐具场景 AI 智能设计助手 V1.0"}
              </div>

              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#4A3B32] tracking-tight mb-4 leading-tight">
                开启您的 AI 餐具场景设计之旅
              </h2>

              <p className="text-sm text-[#888] leading-relaxed">
                无论您是希望得到贴心的智能 AI 助理对话引导，还是渴望在全功能的专业面板上精细调校，我们都为您提供了专属的使用方案。
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              {/* Card 1: Agent Mode */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white rounded-3xl p-8 border border-[#EBE6E0] shadow-[0_4px_20px_rgba(74,59,50,0.02)] flex flex-col justify-between hover:shadow-[0_10px_30px_rgba(74,59,50,0.05)] hover:border-[#D9C4A9] transition-all duration-300 group"
              >
                <div className="space-y-6">
                  <div className="w-14 h-14 bg-[#FDF8EE] rounded-2xl flex items-center justify-center text-[#D4A373] group-hover:scale-110 transition-transform duration-300 border border-[#F5EFE6]">
                    <Bot className="w-7 h-7" />
                  </div>

                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-[#4A3B32]">智能体模式</h3>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-100 font-bold">
                      推荐新手
                    </span>
                  </div>

                  <p className="text-xs text-[#888] leading-relaxed">
                    对话式交互，像和专业设计师聊天一样。AI 将一步步引导您上传餐具图片、选择风格并精细渲染，直接在聊天框内返回生成效果。
                  </p>
                </div>

                <button
                  onClick={() => setMode('agent')}
                  className="mt-8 w-full bg-[#4A3B32] hover:bg-[#3B3029] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md shadow-[#4A3B32]/10 transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>开启智能对话引导</span>
                </button>
              </motion.div>

              {/* Card 2: Expert Mode */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white rounded-3xl p-8 border border-[#EBE6E0] shadow-[0_4px_20px_rgba(74,59,50,0.02)] flex flex-col justify-between hover:shadow-[0_10px_30px_rgba(74,59,50,0.05)] hover:border-[#D9C4A9] transition-all duration-300 group"
              >
                <div className="space-y-6">
                  <div className="w-14 h-14 bg-[#FDF8EE] rounded-2xl flex items-center justify-center text-[#D4A373] group-hover:scale-110 transition-transform duration-300 border border-[#F5EFE6]">
                    <Layout className="w-7 h-7" />
                  </div>

                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-[#4A3B32]">专家工作台</h3>
                    <span className="bg-amber-50 text-amber-700 text-[10px] px-2.5 py-0.5 rounded-full border border-amber-100 font-bold">
                      高阶微调
                    </span>
                  </div>

                  <p className="text-xs text-[#888] leading-relaxed">
                    经典分步流程。提供高可控性的输出设置、画面比例调节与自定义提示词，适合快速精确制作大片，并且支持更高级的专业级参数。
                  </p>
                </div>

                <button
                  onClick={() => setMode('expert')}
                  className="mt-8 w-full bg-[#FCFBF9] hover:bg-[#F5F2EC] text-[#4A3B32] border border-[#EBE6E0] hover:border-[#D9C4A9] font-bold py-3.5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  <Layout className="w-4 h-4" />
                  <span>进入专业工作台</span>
                </button>
              </motion.div>
            </div>
          </div>
        ) : mode === 'agent' ? (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 h-full max-w-6xl mx-auto w-full overflow-hidden">
            {/* Left Panel: Chat Interface */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#EBE6E0] overflow-hidden h-full">
              {/* Chat header */}
              <div className="px-6 py-3.5 border-b border-[#EBE6E0] bg-[#FAF8F5]/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EBDDC9] flex items-center justify-center text-[#4A3B32]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#4A3B32]">AI 餐具艺术设计师</p>
                    <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      在线对话中 · 懂餐具更懂光影
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedImage && (
                    <span className="text-[10px] bg-[#FDF8EE] border border-[#F5EFE6] px-2 py-1 rounded-md text-[#D4A373] font-bold">
                      📸 原图已载入
                    </span>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div 
                ref={chatScrollRef}
                className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#FCFBF9] custom-scrollbar"
              >
                {messages.map((msg) => {
                  const isModel = msg.role === 'model';
                  return (
                    <div 
                      key={msg.id}
                      className={`flex gap-3 max-w-[85%] ${isModel ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
                        isModel ? 'bg-[#EBDDC9] text-[#4A3B32]' : 'bg-[#4A3B32] text-white'
                      }`}>
                        {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="space-y-2.5 flex-1">
                        {/* Bubble Text */}
                        <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                          isModel 
                            ? msg.isError 
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-white text-[#4A3B32] border border-[#F0EBE4]'
                            : 'bg-[#4A3B32] text-white'
                        }`}>
                          <p className="whitespace-pre-line font-medium">{msg.text}</p>
                        </div>

                        {/* Interactive Style Picker Component */}
                        {isModel && msg.component === 'style_picker' && (
                          <div className="bg-white/50 border border-[#F0EBE4] rounded-2xl p-3.5 space-y-3 shadow-sm">
                            <p className="text-[10px] font-bold text-[#8A7969] uppercase tracking-wider">直接点击选择喜欢的场景风格：</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {STYLES.map(style => (
                                <button
                                  key={style.id}
                                  onClick={() => handleStyleSelectInChat(style.id)}
                                  className={`p-2.5 rounded-xl border text-left transition-all hover:bg-[#FDF8EE]/50 ${
                                    selectedStyleId === style.id
                                      ? 'border-[#D9C4A9] bg-[#FDF8EE] text-[#4A3B32]'
                                      : 'border-[#EBE6E0] bg-white text-[#665B54]'
                                  }`}
                                >
                                  <p className="text-[11px] font-bold truncate">{style.name}</p>
                                  <p className="text-[9px] text-[#999] truncate mt-0.5">{style.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Result Card Component */}
                        {isModel && msg.component === 'result_card' && msg.generatedImageUrl && (
                          <div className="bg-white border border-[#EBE6E0] rounded-2xl overflow-hidden shadow-md max-w-sm group relative">
                            <img 
                              src={msg.generatedImageUrl} 
                              alt="Generated" 
                              className="w-full h-auto object-cover max-h-64"
                            />
                            <div className="p-3 bg-white flex items-center justify-between border-t border-[#F0EBE4]">
                              <span className="text-[10px] font-bold text-[#888]">商品场景效果图</span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setZoomPreview(msg.generatedImageUrl!)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-[#4A3B32] transition-colors"
                                  title="放大预览"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={msg.generatedImageUrl}
                                  download={`tableware-agent-result-${Date.now()}.png`}
                                  className="p-1.5 bg-[#4A3B32] text-white hover:bg-[#3B3029] rounded-lg transition-colors"
                                  title="下载图片"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Loader Component */}
                        {isModel && msg.isGenerating && (
                          <div className="flex items-center gap-2 bg-[#FDF8EE] border border-[#F5EFE6] px-4 py-2.5 rounded-2xl max-w-xs text-xs text-[#D4A373] font-bold">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>场景绘制中，请稍后...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isAgentTyping && (
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-xl bg-[#EBDDC9] text-[#4A3B32] flex items-center justify-center text-xs font-bold shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-[#F0EBE4] rounded-2xl px-4 py-3 text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat bottom input */}
              <div className="p-4 border-t border-[#EBE6E0] bg-white space-y-2">
                {/* Quick Suggestions / Actions */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                  {!uploadedImage && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold shrink-0 bg-[#FDF8EE] border border-[#D9C4A9] text-[#D4A373] px-2.5 py-1 rounded-full hover:bg-[#FDF5E6] transition-colors flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> 点击上传餐具原图
                    </button>
                  )}
                  {uploadedImage && (
                    <>
                      <button
                        onClick={() => handleSendChatMessage('比例换成 16:9')}
                        className="text-[10px] shrink-0 bg-[#F5F2EC] hover:bg-[#EAE4D9] text-[#4A3B32] px-2.5 py-1 rounded-full transition-colors font-medium"
                      >
                        📐 比例换成 16:9
                      </button>
                      <button
                        onClick={() => handleSendChatMessage('比例改成 3:4')}
                        className="text-[10px] shrink-0 bg-[#F5F2EC] hover:bg-[#EAE4D9] text-[#4A3B32] px-2.5 py-1 rounded-full transition-colors font-medium"
                      >
                        📐 比例改成 3:4
                      </button>
                      <button
                        onClick={() => handleSendChatMessage('清晰度切换为 4k 超清')}
                        className="text-[10px] shrink-0 bg-[#F5F2EC] hover:bg-[#EAE4D9] text-[#4A3B32] px-2.5 py-1 rounded-full transition-colors font-medium"
                      >
                        {"🌟 Clarity -> 4K 超清"}
                      </button>
                      <button
                        onClick={() => handleSendChatMessage('背景换成复古厨房风格')}
                        className="text-[10px] shrink-0 bg-[#F5F2EC] hover:bg-[#EAE4D9] text-[#4A3B32] px-2.5 py-1 rounded-full transition-colors font-medium"
                      >
                        🍳 换成复古厨房背景
                      </button>
                    </>
                  )}
                </div>

                {/* Input box */}
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-[#F5F2EC] hover:bg-[#EAE4D9] text-[#4A3B32] rounded-xl transition-colors flex items-center justify-center shrink-0"
                    title="上传图片"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="和 AI 艺术家说说你的需求（例如：“把背景换成暖阳餐桌并加几朵白菊花”）"
                    className="flex-1 text-xs px-4 rounded-xl bg-[#FDF8EE]/40 border border-[#EBE6E0] text-[#4A3B32] placeholder-[#A49A90] focus:outline-none focus:border-[#D9C4A9] focus:ring-1 focus:ring-[#D9C4A9]"
                  />
                  <button
                    onClick={() => handleSendChatMessage()}
                    disabled={!inputMessage.trim()}
                    className="p-3 bg-[#4A3B32] hover:bg-[#3B3029] disabled:bg-[#A49A90] disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Live Config & Render Result */}
            <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 bg-white rounded-2xl border border-[#EBE6E0] overflow-hidden flex flex-col h-full shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="p-4 border-b border-[#EBE6E0] bg-[#FAF8F5] shrink-0">
                <h3 className="text-xs font-bold text-[#4A3B32] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                  实时同步配置 & 最新成果
                </h3>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                {/* Active Product Image */}
                <div>
                  <span className="text-[10px] font-bold text-[#A49A90] uppercase tracking-wider block mb-1.5">餐具原图</span>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-[#EBE6E0] rounded-xl aspect-square overflow-hidden bg-[#FAF8F5] relative group cursor-pointer flex items-center justify-center p-2"
                  >
                    {uploadedImage ? (
                      <>
                        <img src={uploadedImage} alt="Original" className="max-w-full max-h-full object-contain" />
                        <div className="absolute inset-0 bg-[#4A3B32]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                          <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5" /> 更换原图
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <Upload className="w-6 h-6 text-[#A49A90] mx-auto mb-1" />
                        <p className="text-[10px] text-[#A49A90]">待上传原图</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sync Parameters */}
                <div className="space-y-2 bg-[#FCFBF9] p-3 rounded-xl border border-[#F0EBE4]">
                  <span className="text-[10px] font-bold text-[#A49A90] uppercase tracking-wider block">实时参数列表</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-[#999] text-[9px]">背景风格</p>
                      <p className="font-bold text-[#4A3B32] truncate">
                        {STYLES.find(s => s.id === selectedStyleId)?.name || '未选'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#999] text-[9px]">长宽比例</p>
                      <p className="font-bold text-[#4A3B32]">{aspectRatio}</p>
                    </div>
                    <div>
                      <p className="text-[#999] text-[9px]">输出分辨率</p>
                      <p className="font-bold text-[#4A3B32] uppercase">{resolution}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#999] text-[9px]">自定义需求</p>
                      <p className="font-bold text-[#4A3B32] line-clamp-1">{customPrompt || '无'}</p>
                    </div>
                  </div>
                </div>

                {/* Latest Render */}
                <div>
                  <span className="text-[10px] font-bold text-[#A49A90] uppercase tracking-wider block mb-1.5">渲染成果预览</span>
                  <div className="border border-[#EBE6E0] rounded-xl aspect-square overflow-hidden bg-[#FAF8F5] relative group flex items-center justify-center p-2">
                    {generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Latest Render" className="max-w-full max-h-full object-contain" />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setZoomPreview(generatedImage)}
                            className="p-1.5 bg-white text-[#4A3B32] rounded-full shadow hover:bg-slate-50"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                          <a 
                            href={generatedImage} 
                            download="latest-render.png"
                            className="p-1.5 bg-[#4A3B32] text-white rounded-full shadow hover:bg-[#3B3029]"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-6 h-6 text-[#A49A90] mx-auto mb-1" />
                        <p className="text-[10px] text-[#A49A90]">等待渲染完成后展现</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Left Column: Settings */}
            <div className="w-full lg:w-[320px] xl:w-[380px] flex flex-col gap-3 shrink-0 lg:h-full lg:overflow-y-auto overflow-x-hidden custom-scrollbar lg:pr-1 pb-4 lg:pb-0">
              <section className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#EBE6E0] shrink-0">
                <h2 className="text-sm font-bold text-[#4A3B32] flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#EBDDC9] text-[#4A3B32] text-xs">1</span> 
                  产品图片
                </h2>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-[#D9C4A9] bg-[#FDFBF7] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FDF8EE] transition-all duration-200 relative overflow-hidden group min-h-[110px]"
                >
                  {uploadedImage ? (
                    <>
                      <img src={uploadedImage} alt="Uploaded tableware" className="absolute inset-0 w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-[#4A3B32]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-sm">
                        <span className="bg-white text-[#4A3B32] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          <RefreshCw className="w-3 h-3" /> 更换图片
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-[#FDF8EE] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                        <ImageIcon className="w-5 h-5 text-[#D4A373]" />
                      </div>
                      <p className="text-xs text-[#4A3B32] font-medium">点击上传或拖拽图片到此处</p>
                      <p className="text-[10px] text-[#888] mt-1">支持 JPG / PNG，建议尺寸 1:1</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </section>

              <section className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#EBE6E0] shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-[#4A3B32] flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#EBDDC9] text-[#4A3B32] text-xs">2</span> 
                    背景风格
                  </h2>
                  <span className="text-[10px] text-[#888] ml-1">选择您喜欢的场景风格</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map(style => {
                    const Icon = style.icon;
                    const isSelected = selectedStyleId === style.id;
                    return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyleId(style.id)}
                      className={`text-center p-3 rounded-xl transition-all duration-200 flex flex-col items-center gap-1.5 border relative ${
                        isSelected
                          ? 'border-[#D9C4A9] bg-[#FDF8EE] shadow-sm' 
                          : 'border-[#EBE6E0] bg-white hover:bg-[#FDFBF7]'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-t-[#D9C4A9] border-l-transparent rounded-tr-xl">
                          <CheckCircle2 className="w-3 h-3 text-white absolute -top-[18px] -left-[10px]" />
                        </div>
                      )}
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#D4A373]' : 'text-[#A49A90]'}`} />
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? 'text-[#4A3B32]' : 'text-[#665B54]'}`}>{style.name}</p>
                        <p className={`text-[9px] mt-0.5 line-clamp-1 ${isSelected ? 'text-[#8A7969]' : 'text-[#999]'}`}>{style.desc}</p>
                      </div>
                    </button>
                  )})}
                </div>
              </section>

              <section className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#EBE6E0] flex-1 flex flex-col">
                <h2 className="text-sm font-bold text-[#4A3B32] flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#EBDDC9] text-[#4A3B32] text-xs">3</span> 
                  输出设置
                </h2>
                
                <div className="space-y-3 flex-1">
                  <div>
                    <label className="text-[11px] font-bold text-[#4A3B32] mb-2 block">比例</label>
                    <div className="flex flex-wrap gap-1.5">
                      {RATIOS.map(ratio => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
                            aspectRatio === ratio
                              ? 'bg-[#4A3B32] text-white shadow-sm'
                              : 'bg-[#F5F2EC] text-[#4A3B32] hover:bg-[#EAE4D9]'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#4A3B32] mb-2 block">清晰度</label>
                    <div className="flex flex-wrap gap-1.5">
                      {RESOLUTIONS.map(res => {
                        const label = res === '1k' ? '标清 (1K)' : res === '2k' ? '高清 (2K)' : '超清 (4K)';
                        return (
                          <button
                            key={res}
                            onClick={() => setResolution(res)}
                            className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
                              resolution === res
                                ? 'bg-[#4A3B32] text-white shadow-sm'
                                : 'bg-[#F5F2EC] text-[#4A3B32] hover:bg-[#EAE4D9]'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-[#4A3B32] mb-2 block">附加要求 (可选)</label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="例如：用男模特生成手持碗碟的图片..."
                      className="w-full text-xs p-2.5 rounded-xl bg-[#FDF8EE] border border-[#EBE6E0] text-[#4A3B32] placeholder-[#A49A90] focus:outline-none focus:border-[#D9C4A9] focus:ring-1 focus:ring-[#D9C4A9] resize-none h-16 custom-scrollbar"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!uploadedImage || isGenerating}
                  className="w-full mt-3 bg-[#4A3B32] hover:bg-[#3B3029] disabled:bg-[#A49A90] disabled:cursor-not-allowed text-[#FDFBF7] font-bold py-3 rounded-xl shadow-md shadow-[#4A3B32]/10 transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98] shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">AI 渲染中...</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4" /> 生成商品场景图
                    </span>
                  )}
                </button>
                
                {error && (
                  <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-start gap-2 shrink-0">
                    <div className="bg-red-100 rounded-full p-0.5 shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-red-600" />
                    </div>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Preview */}
            <div className="flex-1 flex flex-col min-h-[400px] lg:h-full bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#EBE6E0] overflow-hidden">
              <div className="flex-1 relative flex items-center justify-center p-4 lg:p-6 bg-[#FDFBF7]/50 min-h-[300px]">
                {/* Subtle marble/texture background pattern (CSS only) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4A3B32 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center z-10"
                    >
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-[#EBDDC9] rounded-full blur-xl opacity-60 animate-pulse"></div>
                        <Loader2 className="w-12 h-12 animate-spin text-[#D4A373] relative z-10" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#4A3B32] mb-1">正在为您生成高质感场景图...</p>
                        <p className="text-xs text-[#888]">这可能需要几秒钟，请耐心等待</p>
                      </div>
                    </motion.div>
                  ) : generatedImage ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full flex flex-col lg:flex-row gap-4 items-center justify-center z-10"
                    >
                      <div className="relative group rounded-xl overflow-hidden shadow-sm flex-1 max-h-full flex items-center justify-center w-full h-full">
                        <img 
                          src={generatedImage} 
                          alt="商品图" 
                          className="max-w-full max-h-full object-contain"
                        />
                        
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={() => setZoomPreview(generatedImage)}
                            className="p-2.5 bg-white/90 backdrop-blur-md text-[#4A3B32] rounded-full shadow-lg hover:bg-white transition-colors"
                            title="放大"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <a 
                            href={generatedImage} 
                            download={`tableware-${selectedStyleId}-main-${Date.now()}.png`}
                            className="p-2.5 bg-[#4A3B32] text-white rounded-full shadow-lg hover:bg-[#3B3029] transition-colors"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center z-10"
                    >
                      <div className="w-16 h-16 bg-[#FDF8EE] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#F5EFE6]">
                        <ImageIcon className="w-8 h-8 text-[#D4A373]" />
                      </div>
                      <div className="text-center mb-8">
                        <p className="text-[#4A3B32] font-bold text-lg mb-2">等待生成您的专属场景图</p>
                        <p className="text-xs text-[#888]">
                          上传餐具图片并选择背景风格<br/>即可生成高质感的商品展示图
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-2 lg:gap-4">
                        <div className="flex items-center gap-2 bg-[#FDF8EE] px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl border border-[#F5EFE6]">
                          <CheckCircle2 className="w-4 h-4 text-[#D4A373]" />
                          <div className="text-left">
                            <p className="text-[11px] lg:text-xs font-bold text-[#4A3B32]">高质感场景</p>
                            <p className="text-[8px] lg:text-[9px] text-[#888]">真实光影效果</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-[#FDF8EE] px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl border border-[#F5EFE6]">
                          <Layout className="w-4 h-4 text-[#D4A373]" />
                          <div className="text-left">
                            <p className="text-[11px] lg:text-xs font-bold text-[#4A3B32]">多种风格</p>
                            <p className="text-[8px] lg:text-[9px] text-[#888]">满足不同需求</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-[#FDF8EE] px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl border border-[#F5EFE6]">
                          <Zap className="w-4 h-4 text-[#D4A373]" />
                          <div className="text-left">
                            <p className="text-[11px] lg:text-xs font-bold text-[#4A3B32]">一键生成</p>
                            <p className="text-[8px] lg:text-[9px] text-[#888]">简单快速出图</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="px-6 py-3 border-t border-[#EBE6E0] bg-white flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#A49A90]" />
                <span className="text-[10px] text-[#888]">您的图片仅用于生成预览，不会被保存，请放心使用</span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 lg:p-12"
            onClick={() => setZoomPreview(null)}
          >
            <button 
              className="absolute top-6 right-6 lg:top-8 lg:right-8 p-3 bg-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all duration-200"
              onClick={() => setZoomPreview(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomPreview} 
              alt="Zoomed preview" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
