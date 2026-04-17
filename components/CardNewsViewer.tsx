import { NewsItem } from "@/src/services/geminiService";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function CardNewsViewer({ newsItem }: { newsItem: NewsItem }) {
  const images = newsItem.imageUrls && newsItem.imageUrls.length > 0 
    ? newsItem.imageUrls 
    : (newsItem.imageUrl ? [newsItem.imageUrl] : []);

  if (images.length > 0) {
    return (
      <div className="w-full max-w-sm mx-auto aspect-[4/5] relative">
        <Carousel className="w-full h-full">
          <CarouselContent className="h-full">
            {images.map((img, index) => (
              <CarouselItem key={index} className="h-full">
                <div className="p-1 h-full">
                  <div className="h-full relative bg-slate-900 rounded-xl overflow-hidden shadow-md flex items-center justify-center">
                    <img src={img} alt={`${newsItem.title} - ${index + 1}`} className="w-full h-full object-contain" />
                    <div className="absolute top-4 left-4 text-[11px] font-sans font-bold tracking-[0.05em] uppercase text-white bg-black/50 px-2 py-1 rounded">
                      {newsItem.source}
                    </div>
                    <div className="absolute top-4 right-4 text-[10px] font-sans font-bold tracking-[0.05em] uppercase text-white bg-[#B45309]/80 px-2 py-1 rounded">
                      {newsItem.category}
                    </div>
                    {images.length > 1 && (
                      <div className="absolute bottom-4 right-4 text-[10px] font-sans font-bold tracking-[0.05em] uppercase text-white bg-black/50 px-2 py-1 rounded">
                        {index + 1} / {images.length}
                      </div>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 && (
            <>
              <CarouselPrevious className="left-4 bg-white/90 hover:bg-white border border-slate-200 text-slate-900 shadow-sm" />
              <CarouselNext className="right-4 bg-white/90 hover:bg-white border border-slate-200 text-slate-900 shadow-sm" />
            </>
          )}
        </Carousel>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto aspect-[4/5] relative">
      <Carousel className="w-full h-full">
        <CarouselContent className="h-full">
          {/* Title Card */}
          <CarouselItem className="h-full">
            <div className="p-1 h-full">
              <div className="h-full border border-slate-200 bg-slate-900 text-white flex flex-col relative rounded-xl overflow-hidden shadow-md">
                <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                  <div className="absolute top-6 left-6 text-[11px] font-sans font-bold tracking-[0.05em] uppercase text-[#B45309]">
                    {newsItem.source}
                  </div>
                  <div className="absolute top-6 right-6 text-[10px] font-sans font-bold tracking-[0.05em] uppercase text-white bg-white/10 px-2 py-1 rounded">
                    {newsItem.category}
                  </div>
                  <h2 className="font-serif text-[26px] font-bold leading-[1.4] mt-8 text-white">
                    {newsItem.title}
                  </h2>
                  {newsItem.insight && (
                    <div className="mt-8 bg-white/10 p-4 rounded-lg text-left w-full">
                      <p className="text-[11px] font-bold text-[#B45309] mb-2 uppercase tracking-widest">CEO 인사이트</p>
                      <p className="text-[14px] text-slate-200 leading-relaxed">{newsItem.insight}</p>
                    </div>
                  )}
                  {!newsItem.insight && <div className="mt-8 w-12 h-[2px] bg-white/20 mx-auto"></div>}
                  <p className="mt-8 text-[11px] text-slate-400 font-sans uppercase tracking-widest animate-pulse">
                    &gt; 넘겨서 읽기
                  </p>
                </div>
              </div>
            </div>
          </CarouselItem>

          {/* Content Cards */}
          {newsItem.cards.map((card, index) => (
            <CarouselItem key={index} className="h-full">
              <div className="p-1 h-full">
                <div className="h-full border border-slate-200 bg-white text-slate-900 flex flex-col relative rounded-xl overflow-hidden shadow-md">
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="absolute top-6 left-6 text-[11px] font-sans font-bold tracking-[0.05em] uppercase text-slate-400">
                      페이지 {index + 1}/{newsItem.cards.length}
                    </div>
                    <div className="flex-1 flex flex-col justify-center mt-8">
                      <h3 className="font-serif text-[22px] font-bold leading-[1.5] mb-6 text-slate-900">
                        {card.headline}
                      </h3>
                      <p className="text-[15px] leading-[1.7] text-slate-600 font-sans">
                        {card.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 bg-white/90 hover:bg-white border border-slate-200 text-slate-900 shadow-sm" />
        <CarouselNext className="right-4 bg-white/90 hover:bg-white border border-slate-200 text-slate-900 shadow-sm" />
      </Carousel>
    </div>
  );
}
