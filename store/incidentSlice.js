import { createSlice } from "@reduxjs/toolkit";

export const incidentTypes = [
  { value: "collision", label: "Σύγκρουση οχημάτων", color: "#e5484d" },
  { value: "breakdown", label: "Ακινητοποιημένο όχημα", color: "#f59e0b" },
  { value: "roadworks", label: "Έργα / κλείσιμο λωρίδας", color: "#167c80" },
  { value: "debris", label: "Αντικείμενο στο οδόστρωμα", color: "#7c3aed" },
  { value: "weather", label: "Καιρικές συνθήκες / πλημμύρα", color: "#2563eb" },
  { value: "medical", label: "Έκτακτο ιατρικό συμβάν", color: "#dc2626" },
  { value: "congestion", label: "Έντονη συμφόρηση χωρίς σαφή αιτία", color: "#475569" },
];

const demoIncidents = [
  {
    id: "demo-1",
    type: "collision",
    title: "Σύγκρουση στο ύψος Ρέντη",
    description: "Δύο οχήματα στη δεξιά λωρίδα, καθυστέρηση προς Πειραιά.",
    latitude: 37.9634,
    longitude: 23.6789,
    duration_minutes: 42,
    severity: "high",
    status: "active",
    created_at: "2026-04-27T11:45:00.000Z",
  },
  {
    id: "demo-2",
    type: "breakdown",
    title: "Ακινητοποίηση κοντά στη Μεταμόρφωση",
    description: "Φορτηγό στη ΛΕΑ, αυξημένη ροή προς Λαμία.",
    latitude: 38.062,
    longitude: 23.7366,
    duration_minutes: 25,
    severity: "medium",
    status: "monitoring",
    created_at: "2026-04-27T11:03:00.000Z",
  },
  {
    id: "demo-3",
    type: "debris",
    title: "Αντικείμενο στο οδόστρωμα",
    description: "Χαμηλή ταχύτητα στο ύψος Αχαρνών.",
    latitude: 38.0187,
    longitude: 23.7072,
    duration_minutes: 18,
    severity: "low",
    status: "resolved",
    created_at: "2026-04-27T09:45:00.000Z",
  },
];

const incidentSlice = createSlice({
  name: "incidents",
  initialState: {
    items: demoIncidents,
    loading: false,
    error: null,
    filters: {
      type: "all",
      status: "all",
    },
  },
  reducers: {
    setIncidents(state, action) {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    addIncident(state, action) {
      state.items.unshift(action.payload);
    },
    setIncidentsLoading(state, action) {
      state.loading = action.payload;
    },
    setIncidentsError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    setFilter(state, action) {
      state.filters[action.payload.name] = action.payload.value;
    },
  },
});

export const {
  setIncidents,
  addIncident,
  setIncidentsLoading,
  setIncidentsError,
  setFilter,
} = incidentSlice.actions;

export default incidentSlice.reducer;
