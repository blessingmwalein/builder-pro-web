"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Hash } from "lucide-react";
import { useAppDispatch, useAppSelector, useAuth } from "@/lib/hooks";
import { fetchConversations, fetchMessages, sendMessage, setCurrentConversation, markConversationRead } from "@/store/slices/messagingSlice";
import { fetchEmployees } from "@/store/slices/employeesSlice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation, MessageAttachment } from "@/types";
import { CreateConversationDialog } from "@/components/messaging/CreateConversationDialog";
import { MessageInput } from "@/components/messaging/MessageInput";

export default function ClientMessagesPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { conversations, currentConversation, messages } = useAppSelector((s) => s.messaging);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchEmployees({ limit: 200 }));
  }, [dispatch]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  function select(conv: Conversation) {
    dispatch(setCurrentConversation(conv));
    dispatch(fetchMessages({ conversationId: conv.id }));
    if (conv.unreadCount > 0) {
      dispatch(markConversationRead(conv.id)); 
    }
  }

  function handleSend(text: string, attachments?: MessageAttachment[]) {
    if (!currentConversation) return;
    dispatch(sendMessage({ conversationId: currentConversation.id, body: text, attachments }));
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const formatMessageWithMentions = (text: string) => {
    // Simple regex to find @Name
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-blue-500 dark:text-blue-400 font-semibold">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">Communicate with your project team.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>New Chat</Button>
      </div>

      <Card className="flex h-[calc(100vh-220px)] overflow-hidden shadow-sm">
        <div className="w-72 border-r">
          <ScrollArea className="h-full">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center py-12 px-4"><MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" /><p className="text-xs text-muted-foreground">No conversations</p></div>
            ) : conversations.map((conv) => (
              <button key={conv.id} onClick={() => select(conv)} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 ${currentConversation?.id === conv.id ? "bg-muted" : ""}`}>
                <Hash className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title || "Chat"}</p>
                  {conv.lastMessage && <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.body}</p>}
                </div>
                {conv.unreadCount > 0 && <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">{conv.unreadCount}</Badge>}
              </button>
            ))}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          {currentConversation ? (
            <>
              <div className="border-b px-4 py-3"><p className="text-sm font-semibold">{currentConversation.title || "Chat"}</p></div>
              <ScrollArea className="flex-1 p-4 bg-muted/30" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {msg.sender ? `${msg.sender.firstName[0]}${msg.sender.lastName[0]}` : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          {!isMe && msg.sender && (
                            <span className="text-xs text-muted-foreground mb-1 ml-1">
                              {msg.sender.firstName} {msg.sender.lastName}
                            </span>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] sm:max-w-[75%] shadow-sm ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-card border border-border rounded-tl-sm text-foreground"
                            }`}
                          >
                            {formatMessageWithMentions(msg.body)}
                          </div>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((item) => (
                                <div
                                  key={item.fileKey}
                                  className="flex items-center justify-between rounded-md border px-2 py-1 text-xs"
                                >
                                  <span className="max-w-[220px] truncate">{item.fileName}</span>
                                  <span className="text-muted-foreground">{formatBytes(item.sizeBytes)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <MessageInput conversation={currentConversation} onSend={handleSend} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8 bg-muted/10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">Your Messages</p>
                <p className="text-sm text-muted-foreground max-w-xs text-balance">
                  Select a conversation from the left menu or create a new chat to start messaging.
                </p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-2">
                Create New Chat
              </Button>
            </div>
          )}
        </div>
      </Card>

      <CreateConversationDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
