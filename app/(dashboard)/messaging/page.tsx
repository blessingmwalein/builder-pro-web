"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Plus, MessageSquare, Hash, User } from "lucide-react";
import { useAppDispatch, useAppSelector, useAuth } from "@/lib/hooks";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  setCurrentConversation,
} from "@/store/slices/messagingSlice";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Conversation } from "@/types";

export default function MessagingPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { conversations, currentConversation, messages } = useAppSelector((s) => s.messaging);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function selectConversation(conv: Conversation) {
    dispatch(setCurrentConversation(conv));
    dispatch(fetchMessages({ conversationId: conv.id }));
    if (conv.unreadCount > 0) dispatch(markConversationRead(conv.id));
  }

  function handleSend() {
    if (!newMessage.trim() || !currentConversation) return;
    dispatch(sendMessage({ conversationId: currentConversation.id, body: newMessage }));
    setNewMessage("");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Project and team communication." />

      <Card className="flex h-[calc(100vh-220px)] overflow-hidden">
        {/* Sidebar - Conversations */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <Input placeholder="Search conversations..." className="h-9" />
          </div>
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                    currentConversation?.id === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {conv.type === "PROJECT" ? (
                      <Hash className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{conv.title || "Direct Message"}</p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.body}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Main - Messages */}
        <div className="flex-1 flex flex-col">
          {currentConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  {currentConversation.type === "PROJECT" ? (
                    <Hash className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">{currentConversation.title || "Direct Message"}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentConversation.participants?.length || 0} members
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {msg.sender ? `${msg.sender.firstName[0]}${msg.sender.lastName[0]}` : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] ${isMe ? "text-right" : ""}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : "Unknown"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className={`rounded-lg px-3 py-2 text-sm ${
                            isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            {msg.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
