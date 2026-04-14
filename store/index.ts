import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import projectsReducer from "./slices/projectsSlice";
import tasksReducer from "./slices/tasksSlice";
import timeTrackingReducer from "./slices/timeTrackingSlice";
import materialsReducer from "./slices/materialsSlice";
import quotesReducer from "./slices/quotesSlice";
import invoicesReducer from "./slices/invoicesSlice";
import financialsReducer from "./slices/financialsSlice";
import employeesReducer from "./slices/employeesSlice";
import crmReducer from "./slices/crmSlice";
import messagingReducer from "./slices/messagingSlice";
import notificationsReducer from "./slices/notificationsSlice";
import { errorToastMiddleware } from "./errorToastMiddleware";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      projects: projectsReducer,
      tasks: tasksReducer,
      timeTracking: timeTrackingReducer,
      materials: materialsReducer,
      quotes: quotesReducer,
      invoices: invoicesReducer,
      financials: financialsReducer,
      employees: employeesReducer,
      crm: crmReducer,
      messaging: messagingReducer,
      notifications: notificationsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(errorToastMiddleware),
    devTools: process.env.NODE_ENV !== "production",
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
