"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Sparkles, AlertCircle } from "lucide-react";
import { useHousehold } from "@/lib/storage";
import { ChatActionCard, ChatResponse } from "@/lib/schemas/ai";
import { ChatMessageList, ExtendedChatTurn } from "@/components/assistant/ChatMessageList";

export default function AssistantPage() {
  const router = useRouter();
  const { profile, isLoaded } = useHousehold();
  const [messages, setMessages] = useState<ExtendedChatTurn[]>([
    {
      role: "model",
      text:
        profile.constraints.preferredLanguage === "hi"
          ? "नमस्ते! मैं अविर (Avir) स्मार्ट एयर सहायक हूँ। आज आपके परिवार के लिए कौन सी दिनचर्या या सुरक्षा उपाय पर चर्चा करें?"
          : "Hello! I am Avir, your household air adaptation assistant. How can I help optimize your family's routine and reduce peak exposure today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedCardIds, setAppliedCardIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lang = profile.constraints.preferredLanguage;
  const isHi = lang === "hi";

  const handleSendMessage = async (textToSend?: string) => {
    const userMessage = (textToSend ?? input).trim();
    if (!userMessage || loading) return;

    setInput("");
    setError(null);

    const nextMessages: ExtendedChatTurn[] = [...messages, { role: "user", text: userMessage }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const historyTurns = nextMessages.slice(0, -1).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          message: userMessage,
          history: historyTurns,
        }),
      });

      if (!res.ok) {
        throw new Error(`Assistant request failed with status ${res.status}`);
      }

      const json: ChatResponse = await res.json();

      setMessages([
        ...nextMessages,
        {
          role: "model",
          text: json.response,
          toolsUsed: json.toolsUsed,
          actionCards: json.actionCards,
          aiFallback: json.aiFallback,
        },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate assistant response");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAction = (card: ChatActionCard) => {
    setAppliedCardIds((prev) => [...prev, card.actionId]);
    router.push("/simulator");
  };

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        {isHi ? "सहायक लोड हो रहा है..." : "Initializing assistant..."}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isHi ? "अविर बहुभाषी एआई सहायक" : "Bilingual AI Air Assistant"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isHi
              ? "डिटरमिनिस्टिक मॉडल-आधारित 'व्हाट-इफ' प्रश्नोत्तर और अनुकूली सुझाव"
              : "Ask 'what-if' routine questions backed by request-scoped deterministic tools"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Gemini 2.5 Flash
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Messages */}
      <ChatMessageList
        messages={messages}
        onSelectPrompt={(text) => handleSendMessage(text)}
        onApplyAction={handleApplyAction}
        appliedCardIds={appliedCardIds}
        isLoading={loading}
        lang={lang}
      />

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isHi
              ? "स्मॉग से बचाव या दिनचर्या शिफ्ट के बारे में पूछें..."
              : "Ask about shifting routines, peak smog protection, or travel..."
          }
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs focus:outline-none bg-transparent"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
        >
          <span>{isHi ? "भेजें" : "Send"}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
