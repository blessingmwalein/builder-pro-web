"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, MessageSquare, User, UserPlus, X } from "lucide-react";
import { useAppDispatch, useAppSelector, useAuth } from "@/lib/hooks";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  setCurrentConversation,
  addConversationParticipants,
  removeConversationParticipants,
} from "@/store/slices/messagingSlice";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchEmployees } from "@/store/slices/employeesSlice";
import type { Conversation, MessageAttachment } from "@/types";
import { CreateConversationDialog } from "@/components/messaging/CreateConversationDialog";
import { MessageInput } from "@/components/messaging/MessageInput";

export default function MessagingPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { conversations, currentConversation, messages } = useAppSelector((s) => s.messaging);
  const employees = useAppSelector((s) => s.employees.items);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchEmployees({ limit: 200 }));
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

  const currentParticipantIds = useMemo(
    () => new Set(currentConversation?.participants?.map((p) => p.id) ?? []),
    [currentConversation]
  );

  const filteredEmployees = useMemo(() => {
    const query = participantSearch.toLowerCase();
    return employees.filter((emp) => {
      const userId = emp.user?.id;
      if (!emp.user || !userId || userId === user?.id) return false;
      if (currentParticipantIds.has(userId)) return false;
      return (
        emp.user.firstName.toLowerCase().includes(query) ||
        emp.user.lastName.toLowerCase().includes(query) ||
        emp.user.email.toLowerCase().includes(query)
      );
    });
  }, [employees, participantSearch, currentParticipantIds, user?.id]);

  function toggleParticipant(userId: string) {
    setSelectedParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleAddParticipants() {
    if (!currentConversation || selectedParticipants.length === 0) return;
    setIsParticipantsLoading(true);
    try {
      await dispatch(
        addConversationParticipants({
          conversationId: currentConversation.id,
          userIds: selectedParticipants,
        })
      ).unwrap();
      setSelectedParticipants([]);
      setParticipantSearch("");
    } finally {
      setIsParticipantsLoading(false);
    }
  }

  async function handleRemoveParticipant(userId: string) {
    if (!currentConversation) return;
    setIsParticipantsLoading(true);
    try {
      await dispatch(
        removeConversationParticipants({
          conversationId: currentConversation.id,
          userIds: [userId],
        })
      ).unwrap();
    } finally {
      setIsParticipantsLoading(false);
    }
  }

  useEffect(() => {
    if (!isManageOpen) return;
    dispatch(fetchEmployees({ limit: 200 }));
  }, [dispatch, isManageOpen]);

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Project and team communication.">
        <Button onClick={() => setIsCreateOpen(true)}>New Chat</Button>
      </PageHeader>

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
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  {currentConversation.type === "PROJECT" ? (
                    <Hash className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{currentConversation.title || "Direct Message"}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentConversation.participants?.length || 0} members
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsManageOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Manage
                </Button>
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Input */}
              <MessageInput conversation={currentConversation} onSend={handleSend} />
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

      <CreateConversationDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Manage Participants</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Current Participants</Label>
              <div className="space-y-2">
                {(currentConversation?.participants || []).map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {participant.firstName} {participant.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{participant.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isParticipantsLoading || participant.id === user?.id}
                      onClick={() => handleRemoveParticipant(participant.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(currentConversation?.participants?.length || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No participants yet.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Add Participants</Label>
              <Input
                placeholder="Search team members..."
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
              />
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 space-y-1">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleParticipant(emp.user!.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-muted/50 ${
                        selectedParticipants.includes(emp.user!.id) ? "bg-muted" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {emp.user!.firstName} {emp.user!.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{emp.user!.email}</p>
                      </div>
                      {selectedParticipants.includes(emp.user!.id) && (
                        <Badge variant="secondary">Selected</Badge>
                      )}
                    </button>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">No matching users</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageOpen(false)}>
              Done
            </Button>
            <Button
              onClick={handleAddParticipants}
              disabled={isParticipantsLoading || selectedParticipants.length === 0}
            >
              Add Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
