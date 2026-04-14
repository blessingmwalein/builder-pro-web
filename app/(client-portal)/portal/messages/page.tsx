"use client";

import { useEffect, useState, useRef } from "react";
import { Send, MessageSquare, Hash } from "lucide-react";
import { useAppDispatch, useAppSelector, useAuth } from "@/lib/hooks";
import { fetchConversations, fetchMessages, sendMessage, setCurrentConversation } from "@/store/slices/messagingSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/types";

export default function ClientMessagesPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { conversations, currentConversation, messages } = useAppSelector((s) => s.messaging);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(fetchConversations()); }, [dispatch]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  function select(conv: Conversation) {
    dispatch(setCurrentConversation(conv));
    dispatch(fetchMessages({ conversationId: conv.id }));
  }

  function handleSend() {
    if (!newMessage.trim() || !currentConversation) return;
    dispatch(sendMessage({ conversationId: currentConversation.id, body: newMessage }));
    setNewMessage("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Communicate with your project team.</p>
      </div>

      <Card className="flex h-[calc(100vh-300px)] overflow-hidden">
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
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{msg.sender ? `${msg.sender.firstName[0]}${msg.sender.lastName[0]}` : "??"}</AvatarFallback></Avatar>
                        <div className={`rounded-lg px-3 py-2 text-sm max-w-[70%] ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{msg.body}</div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  <Input placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                  <Button type="submit" disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center"><p className="text-sm text-muted-foreground">Select a conversation</p></div>
          )}
        </div>
      </Card>
    </div>
  );
}
