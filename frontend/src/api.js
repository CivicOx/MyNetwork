import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

export const people = {
  list: () => api.get("/people/").then((r) => r.data),
  create: (data) => api.post("/people/", data).then((r) => r.data),
  update: (id, data) => api.patch(`/people/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/people/${id}`).then((r) => r.data),
  uploadPhoto: (id, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/people/${id}/photo`, form).then((r) => r.data);
  },
};

export const connections = {
  list: () => api.get("/connections/").then((r) => r.data),
  create: (data) => api.post("/connections/", data).then((r) => r.data),
  update: (id, data) => api.patch(`/connections/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/connections/${id}`).then((r) => r.data),
};

export const edgeTypes = {
  list: () => api.get("/edge-types/").then((r) => r.data),
  create: (data) => api.post("/edge-types/", data).then((r) => r.data),
  update: (id, data) => api.patch(`/edge-types/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/edge-types/${id}`).then((r) => r.data),
};

export const ai = {
  enrich: (name, hints) => api.post("/ai/enrich", { name, hints }).then((r) => r.data),
  recommend: () => api.get("/ai/recommend").then((r) => r.data),
  exportCsv: () => api.get("/ai/export/csv", { responseType: "blob" }).then((r) => r.data),
  parseResume: () => api.post("/ai/parse-resume").then((r) => r.data),
};

export const profile = {
  get: () => api.get("/profile/").then((r) => r.data),
  update: (data) => api.patch("/profile/", data).then((r) => r.data),
  uploadPhoto: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/profile/photo", form).then((r) => r.data);
  },
  uploadResume: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/profile/resume", form).then((r) => r.data);
  },
};

export const annotations = {
  list: () => api.get("/annotations/").then((r) => r.data),
  create: (data) => api.post("/annotations/", data).then((r) => r.data),
  update: (id, data) => api.patch(`/annotations/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/annotations/${id}`).then((r) => r.data),
};

export default api;
