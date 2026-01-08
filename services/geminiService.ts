
import { GoogleGenAI } from "@google/genai";
import { Message, AIProfile, Role, UserMemory } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private buildSystemInstruction(profile: AIProfile, useMemory: boolean): string {
    const memory = profile.memory;
    let instruction = profile.systemPrompt;
    
    if (useMemory && (memory.identity || memory.personality || memory.behavior || memory.notes || memory.summary)) {
      instruction += "\n\n--- PROFILE MEMORY & CONTEXT ---";
      if (memory.summary) instruction += `\nPast Context: ${memory.summary}`;
      if (memory.identity) instruction += `\nUser Identity: ${memory.identity}`;
      if (memory.personality) instruction += `\nPreferred Tone: ${memory.personality}`;
      if (memory.behavior) instruction += `\nStrict Rules: ${memory.behavior}`;
      if (memory.notes) instruction += `\nAdditional Notes: ${memory.notes}`;
    }
    
    return instruction;
  }

  async *streamChat(
    history: Message[],
    profile: AIProfile,
    useMemory: boolean,
    customApiKey?: string
  ): AsyncGenerator<string> {
    const systemInstruction = this.buildSystemInstruction(profile, useMemory);
    const isGeminiModel = profile.model.includes('gemini');

    if (isGeminiModel) {
      const contents = history.map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const response = await this.ai.models.generateContentStream({
        model: profile.model,
        contents: contents,
        config: {
          systemInstruction,
          temperature: profile.temperature,
        },
      });

      for await (const chunk of response) {
        if (chunk.text) yield chunk.text;
      }
    } else if (customApiKey) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${customApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: profile.model,
          messages: [
            { role: "system", content: systemInstruction },
            ...history.map(m => ({ role: m.role === Role.USER ? "user" : "assistant", content: m.content }))
          ],
          stream: true
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                yield parsed.choices[0].delta.content || "";
              } catch {}
            }
          }
        }
      }
    } else {
      throw new Error("API Key missing for external model.");
    }
  }

  async summarizeConversation(messages: Message[], profile: AIProfile): Promise<string> {
    const chatText = messages.map(m => `${m.role}: ${m.content}`).join("\n");
    const prompt = `Summarize the following conversation into a concise bulleted list of key user preferences, facts mentioned, and current context that should be remembered. Keep it under 200 words.\n\nCONVERSATION:\n${chatText}`;
    
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: "You are a memory processor. Extract only valuable context." }
    });
    
    return response.text || "";
  }
}

export const geminiService = new GeminiService();
