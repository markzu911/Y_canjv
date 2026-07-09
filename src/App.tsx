import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, Download, Maximize2, X, RefreshCw, Sparkles, Coffee, Gem, ChefHat, TreePine, Utensils, Gift, Lightbulb, CheckCircle2, Layout, Zap, Lock, User } from 'lucide-react';
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

export default function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState(STYLES[0].id);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1k');
  const [customPrompt, setCustomPrompt] = useState('');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomPreview, setZoomPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const stylePrompt = STYLES.find(s => s.id === selectedStyleId)?.prompt || 'clean background';
      const payload = {
        imageBase64: uploadedImage,
        style: stylePrompt,
        aspectRatio,
        resolution,
        customPrompt
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

      setGeneratedImage(data.imageUrl);
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
          <div className="hidden lg:flex items-center gap-3 bg-[#FDF8EE] border border-[#EBE6E0] px-4 py-2 rounded-xl">
            <Lightbulb className="w-4 h-4 text-[#D4A373]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#4A3B32]">小贴士</span>
              <span className="text-[10px] text-[#888]">选择合适的背景和光线，能让餐具更出彩哦~</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto lg:overflow-hidden w-full mx-auto px-4 pb-4 lg:px-6 lg:pb-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
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
