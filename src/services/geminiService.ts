import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface NewsItem {
  category: string;
  source: string;
  title: string;
  insight: string;
  content: string;
}

export interface NewsResponse {
  date: string;
  newsItems: NewsItem[];
}

async function fetchNewsFromRSS(category: string, keywords: string, count: number, excludeTitles: string[] = []): Promise<{title: string, description: string, source: string}[]> {
  let query = category;
  if (category === "Bloomberg 주식뉴스") query = "블룸버그 주식";
  if (keywords) query += ` ${keywords}`;
  
  // Use our Vercel/Vite proxy to fetch directly from Google News without CORS issues
  const proxyUrl = `/api/google-news?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko&t=${Date.now()}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Network response was not ok");
    const textData = await response.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(textData, "text/xml");
    
    const items = Array.from(xmlDoc.querySelectorAll("item"));
    const results = [];
    
    for (const item of items) {
      const titleFull = item.querySelector("title")?.textContent || "";
      const titleParts = titleFull.split(" - ");
      const source = titleParts.length > 1 ? titleParts.pop()?.trim() || "알 수 없음" : "알 수 없음";
      const title = titleParts.join(" - ").trim();
      
      const description = item.querySelector("description")?.textContent || "";
      const cleanDescription = description.replace(/<[^>]*>?/gm, '').trim();
      
      const isExcluded = excludeTitles.some(ex => title.includes(ex) || ex.includes(title));
      
      if (!isExcluded && title) {
        results.push({ title, description: cleanDescription, source });
      }
      
      if (results.length >= count) break;
    }
    return results;
  } catch (e) {
    console.error(`RSS Fetch Error for ${category}:`, e);
    return [];
  }
}

export async function generateDailyNews(categories: string[], keywords: string = ""): Promise<NewsResponse> {
  if (!categories || categories.length === 0) {
    throw new Error("최소 하나의 카테고리를 선택해야 합니다.");
  }

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

  // Fetch RSS for all categories in parallel
  const rssPromises = categories.map(cat => fetchNewsFromRSS(cat, keywords, 3));
  const rssResultsArray = await Promise.all(rssPromises);
  
  // Process each category in parallel via its own fast API call
  const generatePromises = categories.map(async (cat, idx) => {
    const rss = rssResultsArray[idx];
    if (rss.length === 0) return [];
    
    let newsContext = `\n[${cat}]\n`;
    rss.forEach((news, i) => {
      newsContext += `${i+1}. 제목: ${news.title}\n   출처: ${news.source}\n   내용: ${news.description}\n`;
    });

    const prompt = `빠른 속도로 요약하되 충분한 정보를 제공하세요. (날짜: ${today})

[기사 목록]
${newsContext}

[필수 조건]
1. 반드시 기사 1개당 JSON 배열 1개 항목 생성 (총 ${rss.length}개). 절대 합치지 마세요.
2. content: 각 뉴스마다 핵심 내용을 3~4문장으로 상세하게 요약하세요.
3. 문체: 모든 문장의 끝은 반드시 '~음', '~슴'으로 끝나도록 간결한 개조식 문체를 사용하세요. ('~습니다', '~해요' 절대 금지. 예: ~전망됨, ~발표함, ~예정임)
4. insight: CEO를 위한 비즈니스 영향 1문장 요약
불필요한 말을 빼고 JSON만 바로 출력하세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: `뉴스 카테고리 (${cat})` },
              source: { type: Type.STRING, description: "출처 신문사 이름" },
              title: { type: Type.STRING, description: "뉴스 기사의 핵심을 요약한 제목" },
              insight: { type: Type.STRING, description: "CEO를 위한 1문장 비즈니스 인사이트 (이 뉴스가 비즈니스에 미치는 영향)" },
              content: { type: Type.STRING, description: "뉴스의 상세 요약 내용 (3~4문장, 개조식 문체)" }
            },
            required: ["category", "source", "title", "insight", "content"]
          }
        }
      }
    });

    if (!response.text) return [];
    return JSON.parse(response.text) as NewsItem[];
  });

  const allNewsArrays = await Promise.all(generatePromises);
  const flatNewsItems = allNewsArrays.flat();

  return { date: today, newsItems: flatNewsItems };
}

export async function generateMoreNews(category: string, existingTitles: string[], keywords: string = ""): Promise<NewsItem[]> {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

  const rssResults = await fetchNewsFromRSS(category, keywords, 6, existingTitles);
  
  if (rssResults.length === 0) return [];
  
  // 더보기(+6개) 로직을 병렬 처리하여 2배 속도 개선 (3개씩 2개로 분할)
  const chunks = [rssResults.slice(0, 3), rssResults.slice(3, 6)].filter(c => c.length > 0);
  
  const generatePromises = chunks.map(async (chunk) => {
    let newsContext = `\n[${category}]\n`;
    chunk.forEach((news, i) => {
      newsContext += `${i+1}. 제목: ${news.title}\n   출처: ${news.source}\n   내용: ${news.description}\n`;
    });

    const prompt = `빠른 속도로 요약하되 충분한 정보를 제공하세요. (날짜: ${today})

[기사 목록]
${newsContext}

[필수 조건]
1. 반드시 기사 1개당 JSON 배열 1개 항목 생성 (총 ${chunk.length}개). 절대 합치지 마세요.
2. content: 각 뉴스마다 핵심 내용을 3~4문장으로 상세하게 요약하세요.
3. 문체: 모든 문장의 끝은 반드시 '~음', '~슴'으로 끝나도록 간결한 개조식 문체를 사용하세요. ('~습니다', '~해요' 절대 금지. 예: ~전망됨, ~발표함, ~예정임)
4. insight: CEO를 위한 비즈니스 영향 1문장 요약
불필요한 말을 빼고 JSON만 바로 출력하세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: `뉴스 카테고리 (${category})` },
              source: { type: Type.STRING, description: "출처 신문사 이름" },
              title: { type: Type.STRING, description: "뉴스 기사의 핵심을 요약한 제목" },
              insight: { type: Type.STRING, description: "CEO를 위한 1문장 비즈니스 인사이트 (이 뉴스가 비즈니스에 미치는 영향)" },
              content: { type: Type.STRING, description: "뉴스의 상세 요약 내용 (3~4문장, 개조식 문체)" }
            },
            required: ["category", "source", "title", "insight", "content"]
          }
        }
      }
    });

    if (!response.text) return [];
    return JSON.parse(response.text) as NewsItem[];
  });

  const allNewsArrays = await Promise.all(generatePromises);
  return allNewsArrays.flat();
}
