"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";
import { hydrateFromStorage, fetchMe } from "./slices/authSlice";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore>(undefined);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    store.dispatch(hydrateFromStorage());
    const token = localStorage.getItem("bp_access_token");
    if (token) {
      store.dispatch(fetchMe());
    }
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
