import { useState } from "react";

const PRESET_COLORS = [
  "#475569", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#a855f7", "#ec4899", "#14b8a6",
];

export default function EditAnnotationModal({ annotation, onClose, onSave, onDelete }) {
  const [label, setLabel] = useState(annotation.label || "");
  const [color, setColor] = useState(annotation.color || "#475569");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ label, color });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <h2>Edit {annotation.kind === "text" ? "Text Box" : "Line"}</h2>

        <div className="form-group">
          <label>{annotation.kind === "text" ? "Label" : "Label (optional)"}</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={annotation.kind === "text" ? "e.g. Alumni, Investors" : "e.g. Divider"}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        <div className="form-group">
          <label>Color</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flex: 1 }}>
              {PRESET_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 22, height: 22, borderRadius: "50%", background: c,
                    cursor: "pointer",
                    outline: color === c ? "2px solid #fff" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 36, height: 32, padding: 2, border: "1px solid #334155", borderRadius: 6, background: "#0f172a", cursor: "pointer" }}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          <button
            className="btn btn-danger"
            onClick={() => confirmDelete ? onDelete() : setConfirmDelete(true)}
            style={{ background: confirmDelete ? "#dc2626" : undefined }}
          >
            {confirmDelete ? "Confirm Delete" : "Delete"}
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
