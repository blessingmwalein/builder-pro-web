"use client";

import { useState, useRef } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Conversation, MessageAttachment } from "@/types";
import { useAppSelector } from "@/lib/hooks";

interface Props {
  conversation: Conversation;
  onSend: (text: string, attachments?: MessageAttachment[]) => void;
  isLoading?: boolean;
}

export function MessageInput({ conversation, onSend, isLoading }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We need to fetch participants to suggest. In the provided data, we only have participantIds or partial users.
  // We can use the global employees list or the conversation.participants if it contains user objects.
  const employees = useAppSelector((s) => s.employees.items);
  const currentUser = useAppSelector((s) => s.auth.user);

  // Filter out current user from mentions
  const mentionableUsers = employees
    .filter((e) => e.user && e.user.id !== currentUser?.id)
    .map((e) => e.user!);

  const filteredUsers = mentionableUsers.filter(
    (u) =>
      u.firstName?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      // Check if it's a valid mention start (either at the beginning or preceded by space)
      if (lastAtSymbolIndex === 0 || textBeforeCursor[lastAtSymbolIndex - 1] === " " || textBeforeCursor[lastAtSymbolIndex - 1] === "\n") {
        const query = textBeforeCursor.slice(lastAtSymbolIndex + 1);
        // Only show if query doesn't have spaces (simple mention detection)
        if (!query.includes(" ")) {
          setMentionQuery(query);
          setShowMentions(true);
          setMentionCursorPos(lastAtSymbolIndex);
          return;
        }
      }
    }
    setShowMentions(false);
  };

  const insertMention = (firstName: string, lastName: string) => {
    if (mentionCursorPos === null) return;
    const name = `${firstName}`; // User requested "Hey @Samanda"
    const textBefore = text.slice(0, mentionCursorPos);
    // find where the mention ends (next space or end of string)
    const cursor = textareaRef.current?.selectionStart || text.length;
    const textAfter = text.slice(cursor);
    
    setText(`${textBefore}@${name} ${textAfter}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleAttachFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => {
      const safeName = file.name.replace(/\s+/g, "-");
      return {
        fileKey: `messages/${crypto.randomUUID()}-${safeName}`,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      } satisfies MessageAttachment;
    });
    setAttachments((prev) => [...prev, ...next]);
  };

  const handleRemoveAttachment = (fileKey: string) => {
    setAttachments((prev) => prev.filter((item) => item.fileKey !== fileKey));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showMentions && filteredUsers.length > 0) {
        // Automatically select the first user on Enter if mentions are open
        insertMention(filteredUsers[0].firstName, filteredUsers[0].lastName);
      } else if ((text.trim() || attachments.length > 0) && !isLoading) {
        onSend(text, attachments.length ? attachments : undefined);
        setText("");
        setAttachments([]);
      }
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  return (
    <div className="relative border-t bg-card p-4">
      {/* Mentions Popover - positioned absolutely above input */}
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 w-64 rounded-md border bg-popover shadow-md z-50 overflow-hidden">
          <ul className="max-h-48 overflow-auto py-1">
            {filteredUsers.map((u) => (
              <li
                key={u.id}
                onClick={() => insertMention(u.firstName, u.lastName)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                  {u.firstName[0]}
                </div>
                <span>
                  {u.firstName} {u.lastName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((item) => (
            <div
              key={item.fileKey}
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
            >
              <span className="max-w-[160px] truncate">{item.fileName}</span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(item.fileKey)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={isLoading}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            handleAttachFiles(e.target.files);
            if (e.target.value) e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="mb-1 h-10 w-10 shrink-0 rounded-full p-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => {
            if ((text.trim() || attachments.length > 0) && !isLoading) {
              onSend(text, attachments.length ? attachments : undefined);
              setText("");
              setAttachments([]);
            }
          }}
          disabled={(!text.trim() && attachments.length === 0) || isLoading}
          className="mb-1 h-10 w-10 shrink-0 rounded-full p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
