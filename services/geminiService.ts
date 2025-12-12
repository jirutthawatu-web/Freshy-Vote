import { GoogleGenAI } from "@google/genai";
import { Contestant } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeResults = async (contestants: Contestant[]): Promise<string> => {
  try {
    const dataSummary = contestants.map(c => 
      `No.${c.number} ${c.name}: ${c.votes} votes`
    ).join('\n');

    const prompt = `
      ทำหน้าที่เป็นผู้ประกาศข่าวงานประกวดที่ตื่นเต้นและสนุกสนาน
      วิเคราะห์ผลคะแนนโหวตล่าสุดต่อไปนี้:
      
      ${dataSummary}
      
      เขียนสรุปสั้นๆ (ไม่เกิน 3-4 ประโยค) เป็นภาษาไทย
      เน้นว่าใครกำลังนำ ใครกำลังมาแรง และเชิญชวนให้คนรีบมาโหวต
      ใส่อารมณ์ขันเล็กน้อย
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Analyst";
  }
};