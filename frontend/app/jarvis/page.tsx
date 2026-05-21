"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  sendChat,
  getConversations,
  getConversation,
  deleteConversation,
  ChatMessage,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Send, Plus, Trash2, Loader2, MessageSquare, Zap,
  Search, Mail, Database, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: string;
}

interface Message extends ChatMessage {
  toolCalls?: ToolCall[];
}

const TOOL_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  search_web: { icon: Globe, label: "Searching the web", color: "text-blue-400" },
  scrape_crunchbase: { icon: Database, label: "Scraping Crunchbase", color: "text-orange-400" },
  find_angel_investors: { icon: Search, label: "Finding investors", color: "text-violet-400" },
  send_email: { icon: Mail, label: "Sending email", color: "text-emerald-400" },
  save_contacts: { icon: Database, label: "Saving contacts", color: "text-amber-400" },
  get_contacts: { icon: Database, label: "Reading contacts", color: "text-neutral-400" },
};

const SUGGESTED = [
  "Find 20 fintech angel investors I can email today",
  "Search for African tech angels who write $3K–$100K checks",
  "Draft my investor pitch email for VersusPay",
  "Scrape https://www.crunchbase.com/lists/... for investor contacts",
  "What's my current fundraising pipeline status?",
];

function ToolCallBlock({ tc, idx }: { tc: ToolCall; idx: number }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[tc.tool] || { icon: Zap, label: tc.tool, color: "text-neutral-400" };
  const Icon = meta.icon;
  const resultPreview = tc.result.slice(0, 120) + (tc.result.length > 120 ? "..." : "");

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden text-[12px] my-1">
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800/30 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className={cn("w-3.5 h-3.5 shrink-0", meta.color)} />
        <span className="text-neutral-400 flex-1">{meta.label}</span>
        <span className="text-neutral-600 font-mono text-[10px]">step {idx + 1}</span>
        {open ? <ChevronUp className="w-3 h-3 text-neutral-600" /> : <ChevronDown className="w-3 h-3 text-neutral-600" />}
      </button>
      {open && (
        <div className="border-t border-neutral-800 px-3 py-2 bg-neutral-950 space-y-2">
          <div>
            <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Input</p>
            <pre className="text-[11px] text-neutral-500 font-mono whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(tc.args, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Output</p>
            <pre className="text-[11px] text-neutral-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
              {tc.result}
            </pre>
          </div>
        </div>
      )}
      {!open && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-neutral-600 font-mono truncate">{resultPreview}</p>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="w-3.5 h-3.5 text-neutral-900" />
        </div>
      )}
      <div className={cn("max-w-2xl", isUser ? "order-first" : "")}>
        {/* Tool calls shown above the reply */}
        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="mb-2 space-y-1">
            {msg.toolCalls.map((tc, i) => (
              <ToolCallBlock key={i} tc={tc} idx={i} />
            ))}
          </div>
        )}
        <div className={cn(
          "rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-neutral-800 text-neutral-200 rounded-br-sm"
            : "bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-bl-sm"
        )}>
          {msg.content}
        </div>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-semibold text-neutral-300">
          A
        </div>
      )}
    </div>
  );
}

function JarvisInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [input, setInput] = useState(initialQ);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
          {
            role: "assistant",
            content: res.data!.reply,
            toolCalls: (res.data as { reply: string; conversationId: string; toolCalls?: ToolCall[] }).toolCalls,
          },
        ]);
        setActiveConvId(res.data.conversationId);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
      setActiveConvId(null);
      setMessages([]);
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

  // Auto-send if ?q= is set
  useEffect(() => {
    if (initialQ && messages.length === 0) {
      setInput("");
      sendMutation.mutate({ message: initialQ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Conversations sidebar */}
      <div className="w-56 shrink-0 border-r border-neutral-800 flex flex-col">
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
                activeConvId === conv.id ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
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

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-neutral-800 px-6 py-3.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-neutral-900" />
          </div>
          <div>
            <h1 className="text-[14px] font-semibold text-white">Jarvis</h1>
            <p className="text-[11px] text-neutral-500">GPT-4o · can search web, scrape Crunchbase, send emails</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto pt-10">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mx-auto mb-5">
                <Zap className="w-6 h-6 text-neutral-900" />
              </div>
              <h2 className="text-xl font-semibold text-white text-center mb-1.5">Good to see you, Abel.</h2>
              <p className="text-neutral-500 text-[13px] text-center mb-8">
                I know your goal — $10M from angels. I can search the web, scrape Crunchbase, and send emails. What do you need?
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
              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
              {streaming && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 text-neutral-900" />
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                    <span className="text-[12px] text-neutral-500">Working...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="border-t border-neutral-800 px-6 py-4">
          <div className="max-w-3xl mx-auto relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell Jarvis what to do — find investors, send emails, research..."
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
            Jarvis can search the web · scrape Crunchbase · send emails from adugamhq@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JarvisPage() {
  return <Suspense><JarvisInner /></Suspense>;
}
