import { useState } from "react";

export default function EditConnectionModal({ connection, edgeTypes, onClose, onSave, onDelete }) {
  const [edgeTypeId, setEdgeTypeId] = useState(String(connection.edge_type_id));
  const [notes, setNotes] = useState(connection.notes || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedEdgeType = edgeTypes.find((e) => e.id === parseInt(edgeTypeId));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ edge_type_id: parseInt(edgeTypeId), notes: notes || null });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Edit Connection</h2>

        <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>
          {connection.person_a_name} ↔ {connection.person_b_name}
        </div>

        <div className="form-group">
          <label>Relationship Type</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select value={edgeTypeId} onChange={(e) => setEdgeTypeId(e.target.value)} style={{ flex: 1 }}>
              {edgeTypes.map((et) => (
                <option key={et.id} value={et.id}>{et.name}</option>
              ))}
            </select>
            {selectedEdgeType && (
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: selectedEdgeType.color, flexShrink: 0 }} />
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="How do they know each other?"
          />
        </div>

        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: confirmDelete ? "#dc2626" : undefined }}
          >
            {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete" : "Delete"}
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
