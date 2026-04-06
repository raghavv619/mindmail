import {GoogleGenerativeAI} from '@google/generative-ai';
import * as types from '../types.js';

// function getModel() {
//   const key = process.env.GEMINI_API_KEY?.trim();
  
//     console.log("👀👀👀👀👀👀👀👀 key: ", key)
//   if (!key) {
//     throw new Error(
//       'Set GEMINI_API_KEY in .env. Create a key at https://aistudio.google.com/apikey',
//     );
//   }
//   const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
//   const genAI = new GoogleGenerativeAI(key);
//   const response= genAI.getGenerativeModel({model: modelName});
//   console.log(response)
//   return response;
// }

export async function getAIAnalysis(email: types.CleanedEmail) {
    const key = process.env.GEMINI_API_KEY?.trim();
    
    if(!key) throw new Error("Key is missing");

    const genAI = new GoogleGenerativeAI(key);

    // FIX: Use 'gemini-1.5-flash' (latest stable) 
    // AND remove the manual apiVersion object for a moment to let the SDK default
    const gemini_model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      Analyze the following email. 
      Subject: ${email.subject}
      From: ${email.sender}
      Body: ${email.body}
      
      Provide a brief summary and a sentiment score (Positive/Neutral/Negative).
    `;
  
    try {
        const result = await gemini_model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        // This will help us see if it's a safety block or a model name issue
        console.error("AI Analysis Error Status:", error.status);
        console.error("AI Analysis Error Message:", error.message);
        return "Failed to analyze email.";
    }
}