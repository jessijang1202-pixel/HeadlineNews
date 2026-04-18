import { useState } from "react";
import { generateDailyNews, generateMoreNews, NewsResponse, NewsItem } from "./services/geminiService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, TrendingUp, Globe, Download, Landmark, Copy, Check, FileText } from "lucide-react";

const CATEGORIES = ["경제뉴스", "Bloomberg 주식뉴스", "국제정세", "정치뉴스"];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NewsResponse | null>(null);
  const [selectedItems, setSelectedItems] = useState<NewsItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES);
  const [keywords, setKeywords] = useState("");
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    "경제뉴스": 3,
    "Bloomberg 주식뉴스": 3,
    "국제정세": 3,
    "정치뉴스": 3
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});

  const todayString = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

  const handleGenerate = async () => {
    if (selectedCategories.length === 0) {
      alert("최소 하나의 카테고리를 선택해주세요.");
      return;
    }
    setLoading(true);
    try {
      const result = await generateDailyNews(selectedCategories, keywords);
      setData(result);
      setVisibleCounts({
        "경제뉴스": 3,
        "Bloomberg 주식뉴스": 3,
        "국제정세": 3,
        "정치뉴스": 3
      });
      setSelectedItems([]);
    } catch (error) {
      console.error("Failed to generate news", error);
      alert("카드뉴스 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (item: NewsItem) => {
    setSelectedItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleOpenPreview = () => {
    if (selectedItems.length === 0) return alert("선택된 뉴스가 없습니다.");
    
    setPreviewOpen(true);
    setCopied(false);

    // Generate Text Format
    let text = `[CEO 브리핑] ${data?.date}\n\n`;
    CATEGORIES.forEach(cat => {
      const catItems = selectedItems.filter(i => i.category === cat);
      if (catItems.length > 0) {
        text += `📊 ${cat}\n`;
        catItems.forEach(item => {
          text += `■ [${item.source}] ${item.title}\n`;
          text += `  - ${item.content}\n`;
          if (item.insight) text += `💡 인사이트: ${item.insight}\n\n`;
        });
      }
    });
    setPreviewText(text.trim());
  };

  const handleOpenSinglePreview = (item: NewsItem) => {
    setPreviewOpen(true);
    setCopied(false);

    let text = `[CEO 브리핑] ${data?.date}\n\n`;
    text += `📊 ${item.category}\n`;
    text += `■ [${item.source}] ${item.title}\n`;
    text += `  - ${item.content}\n`;
    if (item.insight) text += `💡 인사이트: ${item.insight}\n\n`;
    
    setPreviewText(text.trim());
  };

  const handleLoadMore = async (category: string) => {
    if (!data) return;
    setLoadingMore(prev => ({ ...prev, [category]: true }));
    try {
      const existingTitles = data.newsItems.filter(item => item.category === category).map(item => item.title);
      const newItems = await generateMoreNews(category, existingTitles, keywords);
      
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          newsItems: [...prev.newsItems, ...newItems]
        };
      });
      
      setVisibleCounts(prev => ({ ...prev, [category]: (prev[category] || 3) + 6 }));
    } catch (error) {
      console.error("Failed to load more news", error);
      alert(`${category} 더보기 생성에 실패했습니다.`);
    } finally {
      setLoadingMore(prev => ({ ...prev, [category]: false }));
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("복사에 실패했습니다.");
    }
  };

  const getCategoryIcon = (cat: string, className: string = "w-5 h-5 text-slate-900") => {
    if (cat === "경제뉴스") return <TrendingUp className={className} />;
    if (cat === "국제정세") return <Globe className={className} />;
    if (cat === "정치뉴스") return <Landmark className={className} />;
    return <TrendingUp className={className} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setData(null); setSelectedItems([]); setLoading(false); }}>
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white font-serif font-bold text-lg leading-none">B</span>
            </div>
            <h1 className="text-xl font-serif font-bold tracking-tight text-slate-900">Briefify</h1>
          </div>
          <Button 
            onClick={() => { setData(null); setSelectedItems([]); setLoading(false); }}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 text-[13px] font-semibold"
          >
            CEO 뉴스 브리핑
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {!data && !loading && (
          <div className="text-center py-20 max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-12">
            <div className="font-sans text-[13px] font-bold text-[#B45309] mb-4 uppercase tracking-[0.1em]">{todayString}</div>
            <h2 className="text-[42px] font-serif font-bold mb-6 text-slate-900 tracking-tight leading-[1.2]">
              CEO 맞춤형 뉴스 생성기
            </h2>
            <p className="text-[18px] text-slate-500 mb-10 leading-relaxed max-w-xl mx-auto">
              주요 일간지 및 경제지에서 최신 뉴스를 수집하여, 바쁜 경영진을 위한 핵심 요약 뉴스를 자동으로 제작합니다.
            </p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 mb-10 text-center max-w-2xl mx-auto">
              <h3 className="text-slate-900 font-bold text-[16px] mb-6">원하시는 뉴스 카테고리를 선택해주세요</h3>
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-slate-900 cursor-pointer"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    <span className="text-slate-700 group-hover:text-slate-900 transition-colors font-medium">{cat}</span>
                  </label>
                ))}
              </div>
              <h3 className="text-slate-900 font-bold text-[16px] mb-4">핵심 키워드 (선택사항)</h3>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="콤마를 넣어 3개까지 가능합니다"
                className="w-full max-w-md px-4 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-[14px] text-center mx-auto block"
              />
            </div>

            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => handleGenerate()} 
                disabled={selectedCategories.length === 0}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-8 py-6 text-[15px] font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                헤드라인뉴스 생성
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-12 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[300px] bg-slate-100 border border-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Results Header & Category Selection */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-6">
              <div>
                <div className="font-sans text-[12px] font-bold text-[#B45309] mb-2 tracking-[0.05em] uppercase">최종 업데이트</div>
                <h2 className="text-[24px] font-serif font-bold text-slate-900">{data.date}</h2>
              </div>
              
              <div className="flex-1 flex justify-center">
                <div className="flex flex-wrap justify-center gap-4 bg-slate-50 px-6 py-3 rounded-lg border border-slate-200">
                  {CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-slate-900 cursor-pointer"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span className="text-slate-700 text-[14px] font-medium">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 items-end">
                <Button 
                  onClick={() => handleGenerate()} 
                  disabled={loading || selectedCategories.length === 0}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md px-6 py-2 text-[13px] font-semibold w-full md:w-auto"
                >
                  다시 생성하기
                </Button>
                <div className="flex items-center gap-3">
                  {data?.newsItems && data.newsItems.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer mr-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-slate-900 cursor-pointer"
                        checked={selectedItems.length === data.newsItems.length && data.newsItems.length > 0}
                        onChange={() => {
                          if (selectedItems.length === data.newsItems.length) {
                            setSelectedItems([]);
                          } else {
                            setSelectedItems([...data.newsItems]);
                          }
                        }}
                      />
                      <span className="text-[13px] font-bold text-slate-700">전체 선택</span>
                    </label>
                  )}
                  {selectedItems.length > 0 && (
                    <Button 
                      onClick={handleOpenPreview}
                      className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 text-[13px] font-semibold flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      내보내기 ({selectedItems.length})
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {CATEGORIES.map(cat => {
              const items = data.newsItems.filter(item => item.category === cat);
              if (items.length === 0) return null;
              const visible = visibleCounts[cat] || 3;

              return (
                <section key={cat}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(cat)}
                      <h3 className="font-serif text-[20px] font-bold text-slate-900">{cat}</h3>
                    </div>
                    <div className="flex gap-2">
                      {visible < items.length && (
                        <Button 
                          variant="outline" 
                          onClick={() => setVisibleCounts(prev => ({ ...prev, [cat]: items.length }))} 
                          className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[12px] font-semibold h-8"
                        >
                          전체보기
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={() => handleLoadMore(cat)}
                        disabled={loadingMore[cat]}
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[12px] font-semibold h-8"
                      >
                        {loadingMore[cat] ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        더보기 (+6개)
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {items.slice(0, visible).map((item, idx) => (
                      <article 
                        key={idx} 
                        className="bg-white border border-slate-200 flex flex-col relative transition-transform duration-200 hover:-translate-y-1 cursor-pointer shadow-sm rounded-xl overflow-hidden group h-full"
                      >
                        <div className="absolute top-4 right-4 z-20" onClick={(e) => { e.stopPropagation(); toggleSelection(item); }}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-slate-900 cursor-pointer" 
                            checked={selectedItems.includes(item)}
                            onChange={() => {}}
                          />
                        </div>
                        
                        <div 
                          className={`w-full flex-1 min-h-[320px] bg-slate-100 p-6 flex flex-col relative overflow-hidden`}
                          onClick={() => handleOpenSinglePreview(item)}
                        >
                          <div className="bg-slate-900/90 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] self-start mb-4 z-10 rounded-sm">
                            {item.category}
                          </div>
                          <div className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.05em] mb-2 z-10">
                            {item.source}
                          </div>
                          <h2 className="font-serif text-[20px] leading-[1.4] font-semibold text-slate-900 line-clamp-3 z-10 mb-4">
                            {item.title}
                          </h2>
                          <p className="text-[13px] text-slate-600 line-clamp-3 z-10 mb-4 leading-relaxed">
                            {item.content}
                          </p>
                          {item.insight && (
                            <div className="mt-auto pt-4 border-t border-slate-200 z-10">
                              <p className="text-[11px] font-bold text-[#B45309] mb-1">CEO 인사이트</p>
                              <p className="text-[12px] text-slate-600 line-clamp-2">{item.insight}</p>
                            </div>
                          )}
                          <div className="absolute bottom-[-10px] right-[-10px] text-black/5">
                            {getCategoryIcon(cat, "w-32 h-32")}
                          </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white" onClick={() => handleOpenSinglePreview(item)}>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <div className="w-2 h-2 bg-[#22C55E] rounded-full"></div>
                            생성됨
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-xl">
          <DialogTitle className="sr-only">텍스트 복사</DialogTitle>
          <div className="flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 px-4 py-2 text-[14px] font-bold text-slate-900">
                <FileText className="w-4 h-4 text-[#B45309]" />
                텍스트 모드
              </div>
              <div>
                <Button 
                  onClick={handleCopyText}
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-md px-6 py-2 text-[13px] font-semibold flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "복사완료!" : "텍스트 복사"}
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto bg-slate-100 p-8 flex justify-center">
              <div className="w-full max-w-2xl bg-white shadow-sm rounded-lg border border-slate-200 p-8 h-fit">
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-[1.8] text-slate-800">
                  {previewText}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
