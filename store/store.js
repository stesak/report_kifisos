import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import incidentsReducer from "./incidentSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    incidents: incidentsReducer,
  },
});
