import { useState } from "react";

export default function AddConnectionModal({ people, edgeTypes, onClose, onSave }) {
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [edgeTypeId, setEdgeTypeId] = useState(edgeTypes[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!personA || !personB || !edgeTypeId) return;
    setSaving(true);
    try {
      await onSave({
        person_a_id: parseInt(personA),
        person_b_id: parseInt(personB),
        edge_type_id: parseInt(edgeTypeId),
        notes: notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedEdgeType = edgeTypes.find((e) => e.id === parseInt(edgeTypeId));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Add Connection</h2>

        <div className="form-group">
          <label>Person A</label>
          <select value={personA} onChange={(e) => setPersonA(e.target.value)}>
            <option value="">Select person...</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Person B</label>
          <select value={personB} onChange={(e) => setPersonB(e.target.value)}>
            <option value="">Select person...</option>
            {people.filter((p) => String(p.id) !== personA).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Relationship Type</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select value={edgeTypeId} onChange={(e) => setEdgeTypeId(e.target.value)} style={{ flex: 1 }}>
              {edgeTypes.map((et) => <option key={et.id} value={et.id}>{et.name}</option>)}
            </select>
            {selectedEdgeType && (
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: selectedEdgeType.color, flexShrink: 0 }} />
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="How do they know each other?" />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!personA || !personB || !edgeTypeId || saving}>
            {saving ? "Saving..." : "Add Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
