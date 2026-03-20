import { configureStore } from "@reduxjs/toolkit";
import { chatApi } from "./services/chatApi";
import chatReducer from "../features/chat/chatSlice";

export const store = configureStore({
  reducer: {
    [chatApi.reducerPath]: chatApi.reducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(chatApi.middleware),
});