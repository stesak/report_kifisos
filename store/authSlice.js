import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    loading: true,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.loading = false;
    },
    setAuthLoading(state, action) {
      state.loading = action.payload;
    },
    clearUser(state) {
      state.user = null;
      state.loading = false;
    },
  },
});

export const { setUser, setAuthLoading, clearUser } = authSlice.actions;
export default authSlice.reducer;
