"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sendChat,
  getConversations,
  getConversation,
  deleteConversation,
  ChatMessage,
  Conversation,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Send,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTED = [
  "Research the top 10 YC-backed fintech startups I should reach out to",
  "Find remote CTO or Head of Engineering jobs I'd be a good fit for",
  "Draft a cold email to a VC introducing VersusPay",
  "What are the best conferences for fintech founders in 2026?",
  "Write a LinkedIn post about building Softdroom Holdings",
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="w-3.5 h-3.5 text-neutral-900" />
        </div>
      )}
      <div
        className={cn(
          "max-w-2xl rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-neutral-800 text-neutral-200 rounded-br-sm"
            : "bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-bl-sm"
        )}
      >
        {msg.content}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-semibold text-neutral-300">
          A
        </div>
      )}
    </div>
  );
}

export default function JarvisPage() {
  const [input, setInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: convsData } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  const conversations = convsData?.data || [];

  const sendMutation = useMutation({
    mutationFn: ({ message, convId }: { message: string; convId?: string }) =>
      sendChat(message, convId),
    onMutate: ({ message }) => {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setStreaming(true);
    },
    onSuccess: (res) => {
      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.data!.reply },
        ]);
        setActiveConvId(res.data.conversationId);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } else {
        toast.error(res.error || "Failed to get response");
      }
    },
    onError: () => toast.error("Cannot connect to backend"),
    onSettled: () => setStreaming(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (activeConvId) {
        setActiveConvId(null);
        setMessages([]);
      }
    },
  });

  async function loadConversation(id: string) {
    const res = await getConversation(id);
    if (res.success && res.data) {
      setActiveConvId(id);
      setMessages(res.data.messages.filter((m) => m.role !== "system"));
    }
  }

  function handleSend() {
    const msg = input.trim();
    if (!msg || streaming) return;
    setInput("");
    sendMutation.mutate({ message: msg, convId: activeConvId ?? undefined });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function newChat() {
    setActiveConvId(null);
    setMessages([]);
    textareaRef.current?.focus();
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-neutral-800 flex flex-col bg-neutral-950">
        <div className="p-3 border-b border-neutral-800">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-700 text-[13px] text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-px">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                activeConvId === conv.id
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
              )}
              onClick={() => loadConversation(conv.id)}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[12px] truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(conv.id); }}
                className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-neutral-800 px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-neutral-900" />
          </div>
          <div>
            <h1 className="text-[14px] font-semibold text-white">Jarvis</h1>
            <p className="text-[11px] text-neutral-500">
              Your personal AI — powered by GPT-4o
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto pt-12">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mx-auto mb-6">
                <Zap className="w-6 h-6 text-neutral-900" />
              </div>
              <h2 className="text-xl font-semibold text-white text-center mb-2">
                Good to see you, Abel.
              </h2>
              <p className="text-neutral-500 text-[13px] text-center mb-8">
                I know your background, your goals, and your work. Ask me anything.
              </p>
              <div className="space-y-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-neutral-800 text-[13px] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800/30 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {streaming && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 text-neutral-900" />
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-neutral-800 px-6 py-4">
          <div className="max-w-3xl mx-auto relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Jarvis anything — research, emails, jobs, strategy..."
              rows={1}
              className="resize-none bg-neutral-800/60 border-neutral-700 text-white placeholder:text-neutral-600 text-[13px] pr-12 focus-visible:ring-neutral-600 min-h-[44px] max-h-40"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="absolute right-3 bottom-3 w-7 h-7 bg-white rounded-lg flex items-center justify-center text-neutral-900 hover:bg-neutral-200 transition-colors disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-neutral-700 text-center mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
