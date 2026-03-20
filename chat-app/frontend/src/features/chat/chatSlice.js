import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    liveMessages: [],
    typers: [],           // names of people currently typing
  },
  reducers: {
    messageReceived: (state, action) => {
      state.liveMessages.push(action.payload);
    },
    setTyping: (state, action) => {
      const name = action.payload;
      if (!state.typers.includes(name)) {
        state.typers.push(name);
      }
    },
    clearTyping: (state, action) => {
      state.typers = state.typers.filter((n) => n !== action.payload);
    },
  },
});

export const { messageReceived, setTyping, clearTyping } = chatSlice.actions;
export default chatSlice.reducer;