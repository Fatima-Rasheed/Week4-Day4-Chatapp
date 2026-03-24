import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:5000" }),
  endpoints: (builder) => ({
    getMessages: builder.query({
      query: () => "/messages",
    }),
  }),
});

export const { useGetMessagesQuery } = chatApi;