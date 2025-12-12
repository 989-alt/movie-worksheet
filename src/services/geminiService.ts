import { GoogleGenAI, Type } from "@google/genai";
import { MovieFormData, WorksheetData, GenerationMode } from "../types";

// 1. API Key 불러오기 (Vite 환경에 맞는 방식)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// API Key가 없을 경우 콘솔에 경고 (앱이 멈추지 않도록 에러 throw는 함수 내부로 이동)
if (!apiKey) {
  console.warn("Gemini API Key is missing. Check .env.local file.");
}

// 2. 응답 스키마(Schema) 정의
const worksheetSchema = {
  type: Type.OBJECT,
  properties: {
    movieTitle: { type: Type.STRING, description: "The official title of the movie." },
    director: { type: Type.STRING, description: "Director of the movie." },
    releaseYear: { type: Type.STRING, description: "Release year." },
    genre: { type: Type.STRING, description: "Main genre." },
    ageRating: { type: Type.STRING, description: "Official age rating (e.g., PG, PG-13, R, G)." },
    isAppropriate: { 
      type: Type.BOOLEAN, 
      description: "Whether the movie is appropriate for the specified target age based on content intensity (violence, sexual content, language)." 
    },
    inappropriateReason: { 
      type: Type.STRING, 
      description: "If isAppropriate is false, explain why in Korean. If true, leave empty." 
    },
    plotSummary: { type: Type.STRING, description: "A concise summary of the plot suitable for the target age in Korean." },
    educationalThemes: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "List of 3-5 educational themes present in the movie in Korean." 
    },
    discussionQuestions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "3 deep discussion questions related to the themes in Korean." 
    },
    activityContent: { 
      type: Type.STRING, 
      description: "The main activity worksheet content in HTML format (using basic tags like <p>, <ul>, <li>, <strong>). tailored to the selected Activity Type in Korean." 
    },
    themeColor: {
      type: Type.STRING,
      description: "A hex color code (e.g., #1e3a8a) that best matches the movie's mood and poster. Avoid pure black or white."
    },
    designStyle: {
      type: Type.STRING,
      enum: ["modern", "retro", "playful", "minimal"],
      description: "The visual style that best fits the movie's genre. Horror/Noir -> modern/minimal, Animation -> playful, History -> retro."
    }
  },
  required: [
    "movieTitle",
    "director",
    "releaseYear",
    "genre",
    "ageRating",
    "isAppropriate",
    "plotSummary",
    "educationalThemes",
    "discussionQuestions",
    "activityContent",
    "themeColor",
    "designStyle"
  ],
};

// 3. 워크시트 생성 함수
export const generateWorksheet = async (formData: MovieFormData): Promise<WorksheetData> => {
  // 함수 실행 시점에 API Key 다시 체크
  if (!apiKey) {
    console.error("API Key is missing in environment variables.");
    throw new Error("API Key is missing. Please check your .env.local and restart the server.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are an expert educational consultant and graphic designer. Create a movie worksheet for a student aged ${formData.targetAge} (international age).
    The requested activity type is: "${formData.activityType}".
    
    CRITICAL: Analyze the movie's content (violence, sexuality, language, drugs) strictly against the target age of ${formData.targetAge}.
    If the movie is rated R or equivalent and the target age is under 17, mark 'isAppropriate' as false.
    If the content is clearly too mature for the age, mark 'isAppropriate' as false.
    
    Output Language: Korean (Hangul).
    
    Also, analyze the movie's visual style and mood to determine the 'themeColor' and 'designStyle'.
    - 'modern': Sci-fi, Action, Thriller
    - 'retro': History, Classic, Drama
    - 'playful': Animation, Comedy, Family
    - 'minimal': Documentary, Serious Drama

    REGARDING OTT AVAILABILITY (Korea):
    - STRICTLY VERIFY availability on Korean domestic platforms (Tving, Wavve, Coupang Play, Watcha).
    - DO NOT GUESS availability. If you are not 100% certain about a movie's presence on a specific KOREAN platform (Tving, Coupang Play, etc.), DO NOT mention that platform.
    - It is better to omit the OTT platform field or suggest generic "VOD/Store" or global "Netflix/Disney+" if sure, than to hallucinate local availability.
    - It is a critical error to say a movie is on Coupang Play or Tving when it is not. When in doubt, omit the platform name.

    You are a helpful, professional educational AI assistant.
  `;

  let prompt = "";
  if (formData.mode === GenerationMode.SPECIFIC_MOVIE) {
    prompt = `Target Movie: "${formData.movieTitle}". Analyze this specific movie.`;
  } else {
    prompt = `
      Recommend a high-quality movie available on ${formData.ottPlatform || "any major streaming service"} 
      that relates to the educational topic: "${formData.topic}".
      Choose a movie that is highly acclaimed and educationally valuable.
      IMPORTANT: If recommending based on a specific Korean OTT (Tving, Wavve, Coupang Play), only recommend if you are reasonably sure it was recently in their catalog or is a persistent title. Otherwise, recommend a movie available on Netflix/Disney+ or VOD.
    `;
  }

  console.log(`[Gemini Request] Mode: ${formData.mode}, Age: ${formData.targetAge}, Activity: ${formData.activityType}`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: worksheetSchema,
        systemInstruction: systemInstruction,
      },
    });

    const text = response.text; // .text가 함수일 수 있으므로 .text()로 호출하거나 속성 확인 필요. 여기선 @google/genai 최신 버전에 맞춤
    
    console.log("[Gemini Response Raw]:", text);

    if (!text) {
      throw new Error("No response generated from AI.");
    }

    const data = JSON.parse(text) as WorksheetData;
    return data;
  } catch (error) {
    console.error("[Gemini API Error]:", error);
    throw new Error("Failed to generate worksheet. Please try again.");
  }
};