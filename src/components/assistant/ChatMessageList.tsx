"use client";

import React from "react";
import { User, Bot } from "lucide-react";
import { ChatTurn, ChatActionCard } from "@/lib/schemas/ai";
import { ToolExecutionBadge } from "./ToolExecutionBadge";
import { ActionCardView } from "./ActionCardView";

export interface ExtendedChatTurn extends ChatTurn {
  toolsUsed?: string[];
  actionCards?: ChatActionCard[];
  aiFallback?: boolean;
}

interface ChatMessageListProps {
  messages: ExtendedChatTurn[];
  onSelectPrompt: (promptText: string) => void;
  onApplyAction: (card: ChatActionCard) => void;
  appliedCardIds: string[];
  isLoading?: boolean;
  lang?: "en" | "hi";
}

const QUICK_PROMPTS = [
  {
    en: "What is our highest exposure activity today?",
    hi: "आज हमारे घर में सबसे ज्यादा प्रदूषण किस गतिविधि से है?",
  },
  {
    en: "Can I shift my morning walk to the afternoon?",
    hi: "क्या मैं सुबह की सैर को दोपहर में शिफ्ट कर सकता हूँ?",
  },
  {
    en: "How much exposure and vehicle km do we save switching to Metro?",
    hi: "मेट्रो पर स्विच करने से कितना प्रदूषण और वाहन किमी बचेगा?",
  },
];

export function ChatMessageList({
  messages,
  onSelectPrompt,
  onApplyAction,
  appliedCardIds,
  isLoading = false,
  lang = "en",
}: ChatMessageListProps) {
  const isHi = lang === "hi";

  return (
    <div className="space-y-4">
      {/* Quick Prompts */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {isHi ? "त्वरित प्रश्न:" : "Quick Inquiries:"}
        </span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.en}
            type="button"
            onClick={() => onSelectPrompt(isHi ? prompt.hi : prompt.en)}
            disabled={isLoading}
            className="text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full shadow-2xs transition disabled:opacity-50"
          >
            {isHi ? prompt.hi : prompt.en}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="space-y-4 min-h-[350px]">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-4 space-y-2 ${
                  isUser
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* Tool execution badges */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                    {msg.toolsUsed.map((tool) => (
                      <ToolExecutionBadge key={tool} toolName={tool} lang={lang} />
                    ))}
                  </div>
                )}

                {/* Action cards */}
                {msg.actionCards && msg.actionCards.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {msg.actionCards.map((card) => (
                      <ActionCardView
                        key={card.actionId}
                        card={card}
                        onApply={onApplyAction}
                        isApplied={appliedCardIds.includes(card.actionId)}
                        lang={lang}
                      />
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 text-xs justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-2 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-medium ml-1">
                {isHi ? "उत्तर तैयार कर रहा है..." : "Consulting deterministic models..."}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
