import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Conversation, Message, PaginatedResponse } from "@/types";

interface MessagingState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  messagesTotal: number;
  isLoading: boolean;
}

const initialState: MessagingState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  messagesTotal: 0,
  isLoading: false,
};

export const fetchConversations = createAsyncThunk(
  "messaging/fetchConversations",
  async () => api.get<Conversation[]>("/messaging/conversations")
);

export const createConversation = createAsyncThunk(
  "messaging/createConversation",
  async (data: { type: "PROJECT" | "DIRECT"; projectId?: string; title?: string; participantIds?: string[] }) =>
    api.post<Conversation>("/messaging/conversations", data)
);

export const fetchMessages = createAsyncThunk(
  "messaging/fetchMessages",
  async ({ conversationId, page = 1 }: { conversationId: string; page?: number }) =>
    api.get<PaginatedResponse<Message>>(`/messaging/conversations/${conversationId}/messages`, { page, limit: 50 })
);

export const sendMessage = createAsyncThunk(
  "messaging/sendMessage",
  async ({ conversationId, body }: { conversationId: string; body: string }) =>
    api.post<Message>("/messaging/messages", { conversationId, body })
);

export const markConversationRead = createAsyncThunk(
  "messaging/markRead",
  async (conversationId: string) => {
    await api.put(`/messaging/conversations/${conversationId}/read`);
    return conversationId;
  }
);

const messagingSlice = createSlice({
  name: "messaging",
  initialState,
  reducers: {
    setCurrentConversation(state, action) {
      state.currentConversation = action.payload;
    },
    addIncomingMessage(state, action) {
      state.messages.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => { state.isLoading = true; })
      .addCase(fetchConversations.fulfilled, (state, { payload }) => {
        state.conversations = payload;
        state.isLoading = false;
      })
      .addCase(fetchConversations.rejected, (state) => { state.isLoading = false; })
      .addCase(createConversation.fulfilled, (state, { payload }) => {
        state.conversations.unshift(payload);
      })
      .addCase(fetchMessages.fulfilled, (state, { payload }) => {
        state.messages = payload.items;
        state.messagesTotal = payload.meta.total;
      })
      .addCase(sendMessage.fulfilled, (state, { payload }) => {
        state.messages.push(payload);
      })
      .addCase(markConversationRead.fulfilled, (state, { payload }) => {
        const conv = state.conversations.find((c) => c.id === payload);
        if (conv) conv.unreadCount = 0;
      });
  },
});

export const { setCurrentConversation, addIncomingMessage } = messagingSlice.actions;
export default messagingSlice.reducer;
