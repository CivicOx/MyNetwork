import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({ baseURL: BASE_URL });

export const people = {
  list: () => api.get("/people/").then((r) => r.data),
  create: (data) => api.post("/people/", data).then((r) => r.data),
  update: (id, data) => api.patch(`/people/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/people/${id}`).then((r) => r.data),
};

export const connections = {
  list: () => api.get("/connections/").then((r) => r.data),
  create: (data) => api.post("/connections/", data).then((r) => r.data),
  update: (id, data) => api.patch(`/connections/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/connections/${id}`).then((r) => r.data),
};

export const edgeTypes = {
  list: () => api.get("/edge-types/").then((r) => r.data),
};

export const profile = {
  get: () => api.get("/profile/").then((r) => r.data),
  update: (data) => api.patch("/profile/", data).then((r) => r.data),
};

export const ai = {
  enrich: (name, hints) => api.post("/ai/enrich", { name, hints }).then((r) => r.data),
  recommend: () => api.get("/ai/recommend").then((r) => r.data),
  discover: (excludeNames = []) => api.post("/ai/discover", { exclude_names: excludeNames }).then((r) => r.data),
};

export const outreach = {
  list: () => api.get("/outreach/").then((r) => r.data),
  add: (data) => api.post("/outreach/", data).then((r) => r.data),
  update: (id, data) => api.patch(`/outreach/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/outreach/${id}`).then((r) => r.data),
};

export { BASE_URL };
export default api;
