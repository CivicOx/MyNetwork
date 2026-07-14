import { useState } from "react";
import { edgeTypes as etApi } from "../api";

const PRESET_COLORS = [
  "#94a3b8", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#a855f7", "#ec4899", "#14b8a6",
];

function EdgeTypeRow({ et, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(et.name);
  const [color, setColor] = useState(et.color);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const updated = await etApi.update(et.id, { name: name.trim(), color });
      setEditing(false);
      onUpdated(updated);
    } catch (e) {
      setError(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await etApi.delete(et.id);
      onDeleted(et.id);
    } catch (e) {
      setError(e?.response?.data?.detail || "Delete failed");
      setConfirmDelete(false);
    }
  };

  if (editing) {
    return (
      <div style={{ padding: "0.6rem", background: "#1e293b", borderRadius: 8, marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, fontSize: "0.9rem" }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 36, height: 32, padding: 2, border: "1px solid #334155", borderRadius: 6, background: "#0f172a", cursor: "pointer" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
          {PRESET_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => setColor(c)}
              style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", outline: color === c ? "2px solid #fff" : "none", outlineOffset: 2 }}
            />
          ))}
        </div>
        {error && <p style={{ color: "#f87171", fontSize: "0.78rem", margin: "0.25rem 0" }}>{error}</p>}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setName(et.name); setColor(et.color); }}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.25rem", borderBottom: "1px solid #1e293b" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: et.color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: "0.9rem" }}>{et.name}</span>
      {et.is_default && <span style={{ fontSize: "0.7rem", color: "#475569" }}>default</span>}
      {!et.is_default && (
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(true); setConfirmDelete(false); setError(""); }}>Edit</button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            style={{ color: confirmDelete ? "#f87171" : undefined }}
          >
            {confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManageEdgeTypesModal({ edgeTypes, onClose, onChanged }) {
  const [types, setTypes] = useState(edgeTypes);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const created = await etApi.create({ name: newName.trim(), color: newColor });
      const updated = [...types, created];
      setTypes(updated);
      onChanged(updated);
      setNewName("");
      setNewColor("#3b82f6");
    } catch (e) {
      setCreateError(e?.response?.data?.detail || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdated = (updated) => {
    const next = types.map((t) => t.id === updated.id ? updated : t);
    setTypes(next);
    onChanged(next);
  };

  const handleDeleted = (id) => {
    const next = types.filter((t) => t.id !== id);
    setTypes(next);
    onChanged(next);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <h2>Connection Types</h2>

        <div style={{ marginBottom: "1.25rem" }}>
          {types.map((et) => (
            <EdgeTypeRow key={et.id} et={et} onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))}
        </div>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: "1rem" }}>
          <h3 style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>New Type</h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Mentor, Family, Investor"
              style={{ flex: 1, fontSize: "0.9rem" }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ width: 36, height: 32, padding: 2, border: "1px solid #334155", borderRadius: 6, background: "#0f172a", cursor: "pointer" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            {PRESET_COLORS.map((c) => (
              <div
                key={c}
                onClick={() => setNewColor(c)}
                style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", outline: newColor === c ? "2px solid #fff" : "none", outlineOffset: 2 }}
              />
            ))}
          </div>
          {createError && <p style={{ color: "#f87171", fontSize: "0.78rem", margin: "0.25rem 0 0.5rem" }}>{createError}</p>}
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "+ Create Type"}
          </button>
        </div>

        <div className="modal-actions" style={{ marginTop: "1rem" }}>
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
