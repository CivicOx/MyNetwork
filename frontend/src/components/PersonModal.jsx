import { useState, useRef } from "react";
import { people as peopleApi } from "../api";

export default function PersonModal({ person, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    name: person.name || "",
    email: person.email || "",
    phone: person.phone || "",
    linkedin_url: person.linkedin_url || "",
    company: person.company || "",
    title: person.title || "",
    location: person.location || "",
    ai_bio: person.ai_bio || "",
    notes: person.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${person.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await peopleApi.uploadPhoto(person.id, file);
    onClose();
  };

  const photoSrc = person.photo_path
    ? `http://localhost:8000/${person.photo_path}`
    : person.photo_url;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 540 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
          <div
            style={{ width: 64, height: 64, borderRadius: "50%", background: "#334155", flexShrink: 0, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, color: "#94a3b8" }}
            onClick={() => fileRef.current?.click()}
            title="Click to change photo"
          >
            {photoSrc
              ? <img src={photoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : form.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: 0 }}>{person.name}</h2>
            {person.title && <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{person.title}{person.company ? ` · ${person.company}` : ""}</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
        </div>

        <div className="form-row">
          <div className="form-group"><label>Name</label><input value={form.name} onChange={set("name")} /></div>
          <div className="form-group"><label>Email</label><input value={form.email} onChange={set("email")} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Phone</label><input value={form.phone} onChange={set("phone")} /></div>
          <div className="form-group"><label>Location</label><input value={form.location} onChange={set("location")} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Company</label><input value={form.company} onChange={set("company")} /></div>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={set("title")} /></div>
        </div>
        <div className="form-group"><label>LinkedIn URL</label><input value={form.linkedin_url} onChange={set("linkedin_url")} /></div>

        {form.ai_bio && (
          <div className="form-group">
            <label>AI Bio</label>
            <textarea value={form.ai_bio} onChange={set("ai_bio")} rows={3} />
          </div>
        )}

        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={set("notes")} rows={4} placeholder="Add notes about this person..." />
        </div>

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
