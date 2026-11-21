import React, { useEffect, useState, useRef } from "react";
import {
  Hash,
  User,
  Send,
  MessageSquare,
  Search,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Tag,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/lib/api";
import { ChatChannelItem, ChatUserItem, ChatMessageItem, CaseListItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const InternalChatPage: React.FC = () => {
  const { user } = useAuth();

  const [channels, setChannels] = useState<ChatChannelItem[]>([]);
  const [colleagues, setColleagues] = useState<ChatUserItem[]>([]);
  const [activeType, setActiveType] = useState<"channel" | "direct">("channel");
  const [activeChannel, setActiveChannel] = useState<string>("general");
  const [activeRecipient, setActiveRecipient] = useState<ChatUserItem | null>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Case tagging helper
  const [recentCases, setRecentCases] = useState<CaseListItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [showTagSelector, setShowTagSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load channels and colleagues
  const loadSidebar = async () => {
    try {
      const [chanRes, usersRes] = await Promise.all([
        apiClient.get<ChatChannelItem[]>("/chat/channels"),
        apiClient.get<ChatUserItem[]>("/chat/users"),
      ]);
      setChannels(chanRes.data);
      setColleagues(usersRes.data);
    } catch (err) {
      console.error("Failed to load chat channels/users:", err);
    }
  };

  useEffect(() => {
    loadSidebar();
    // Load recent cases for tagging
    apiClient.get<CaseListItem[]>("/cases?limit=10")
      .then((res) => setRecentCases(res.data))
      .catch((err) => console.error("Failed to load cases for tagging:", err));
  }, []);

  // Fetch messages for active thread
  const fetchMessages = async () => {
    try {
      const params: any = {};
      if (activeType === "channel") {
        params.channel = activeChannel;
      } else if (activeRecipient) {
        params.recipient_id = activeRecipient.id;
      }

      const res = await apiClient.get<ChatMessageItem[]>("/chat/messages", { params });
      setMessages(res.data);

      // Mark read
      if (activeType === "channel") {
        await apiClient.post(`/chat/mark-read?channel=${activeChannel}`);
      } else if (activeRecipient) {
        await apiClient.post(`/chat/mark-read?sender_id=${activeRecipient.id}`);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  useEffect(() => {
    setIsLoadingMessages(true);
    fetchMessages().finally(() => setIsLoadingMessages(false));

    // Reactive 5-second polling interval for team collaboration
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeType, activeChannel, activeRecipient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    try {
      const payload: any = {
        content: inputText.trim(),
        case_id: selectedCaseId || undefined,
      };

      if (activeType === "channel") {
        payload.channel = activeChannel;
      } else if (activeRecipient) {
        payload.recipient_id = activeRecipient.id;
      }

      const res = await apiClient.post<ChatMessageItem>("/chat/messages", payload);
      setMessages((prev) => [...prev, res.data]);
      setInputText("");
      setSelectedCaseId("");
      setShowTagSelector(false);
      loadSidebar();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const currentChannelObj = channels.find((c) => c.name === activeChannel);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clinical Team Messenger"
        description="Internal communication platform corresponding to seventh_tab_chat.png connecting doctors, nurses, radiographers, and front-desk staff."
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left Side: Channels & Colleagues (4 cols) */}
        <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/70 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Staff Discussions
              </span>
              <button
                onClick={loadSidebar}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title="Refresh channels"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {/* Channels Group */}
            <div>
              <div className="px-2 pb-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Hospital Channels
              </div>
              <div className="space-y-1">
                {channels.map((ch) => {
                  const isActive = activeType === "channel" && activeChannel === ch.name;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveType("channel");
                        setActiveChannel(ch.name);
                        setActiveRecipient(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Hash className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span className="truncate">{ch.display_name}</span>
                      </div>
                      {ch.unread_count > 0 && !isActive && (
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          {ch.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Messages Group */}
            <div>
              <div className="px-2 pb-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Direct Messages ({colleagues.length})
              </div>
              <div className="space-y-1">
                {colleagues.map((col) => {
                  const isActive = activeType === "direct" && activeRecipient?.id === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => {
                        setActiveType("direct");
                        setActiveRecipient(col);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <div className="relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isActive ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700"
                          }`}>
                            {col.full_name.charAt(0)}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                        </div>
                        <div className="truncate">
                          <div className="truncate font-medium">{col.full_name}</div>
                          <div className={`text-[10px] truncate ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                            {col.role}
                          </div>
                        </div>
                      </div>
                      {col.unread_count > 0 && !isActive && (
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          {col.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Message Stream & Composer (8 cols) */}
        <div className="md:col-span-8 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shadow-sm">
            <div className="flex items-center space-x-3">
              {activeType === "channel" ? (
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Hash className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  {activeRecipient?.full_name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {activeType === "channel" ? currentChannelObj?.display_name : activeRecipient?.full_name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeType === "channel" ? currentChannelObj?.description : `${activeRecipient?.role} • Apex Health Diagnostics`}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[460px]">
            {isLoadingMessages ? (
              <div className="py-20">
                <LoadingSpinner size="md" message="Loading conversation feed..." />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400">No messages yet in this discussion.</p>
                <p className="text-[11px] text-slate-400">Be the first to post an update or case inquiry.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isMe ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}>
                      {m.sender_name.charAt(0)}
                    </div>
                    <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                      <div className="flex items-center space-x-1.5 text-[11px]">
                        <span className="font-semibold text-slate-900">{isMe ? "You" : m.sender_name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {m.sender_role}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-slate-100 text-slate-800 rounded-tl-none"
                      }`}>
                        <p>{m.content}</p>
                        {m.case_number && (
                          <div className={`mt-2 pt-2 border-t flex items-center gap-1.5 text-[10px] font-mono font-medium ${
                            isMe ? "border-blue-500 text-blue-100" : "border-slate-200 text-blue-700"
                          }`}>
                            <FileText className="w-3 h-3" />
                            <span>Linked Case: #{m.case_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Tag Selector Popover if active */}
          {showTagSelector && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700">Link Clinical Case:</span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="">No Case Tagged</option>
                {recentCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} ({c.patient_name})
                  </option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => setShowTagSelector(false)} className="h-7 text-xs">
                Dismiss
              </Button>
            </div>
          )}

          {/* Message Composer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTagSelector(!showTagSelector)}
              title="Tag a clinical case in this message"
              className="h-10 px-2.5 text-slate-500 hover:text-blue-600 shrink-0"
            >
              <Tag className="w-4 h-4" />
            </Button>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeType === "channel"
                  ? `Message #${currentChannelObj?.display_name}...`
                  : `Message ${activeRecipient?.full_name}...`
              }
              className="h-10 text-xs flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSending || !inputText.trim()}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
