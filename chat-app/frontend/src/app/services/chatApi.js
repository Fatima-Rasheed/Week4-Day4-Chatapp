import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://week4-day4chatapp.vercel.app" }),
  endpoints: (builder) => ({
    getMessages: builder.query({
      query: () => "/messages",
    }),
  }),
});

export const { useGetMessagesQuery } = chatApi;