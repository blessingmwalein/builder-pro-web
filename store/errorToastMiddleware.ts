import { isRejected, type Middleware } from "@reduxjs/toolkit";
import { toast } from "sonner";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

function extractMessage(action: unknown): string {
  if (!action || typeof action !== "object") return GENERIC_ERROR_MESSAGE;

  const typed = action as {
    error?: { message?: string };
    payload?: unknown;
    meta?: { aborted?: boolean; condition?: boolean };
  };

  if (typed.meta?.aborted || typed.meta?.condition) {
    return "";
  }

  const payload = typed.payload as
    | { message?: unknown; error?: unknown }
    | undefined;

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (Array.isArray(payload?.message) && payload.message.length > 0) {
    const first = payload.message.find(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
    if (first) return first;
  }

  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (typeof typed.error?.message === "string" && typed.error.message.trim()) {
    return typed.error.message;
  }

  return GENERIC_ERROR_MESSAGE;
}

export const errorToastMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  if (isRejected(action)) {
    const message = extractMessage(action);
    if (message) {
      toast.error(message, {
        id: `${action.type}:${message}`,
      });
    }
  }

  return result;
};
