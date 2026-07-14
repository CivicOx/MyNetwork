import { useState } from "react";
import { ai } from "../api";

export default function AddPersonModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [hints, setHints] = useState("");
  const [enriched, setEnriched] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await ai.enrich(name.trim(), hints.trim() || undefined);
      setEnriched(result);
    } catch (e) {
      setError("Search failed. You can still add the person manually.");
      setEnriched({ name: name.trim() });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(enriched || { name: name.trim() });
    } catch (e) {
      setError("Failed to save. Is the backend running? " + (e?.response?.data?.detail || e?.message || ""));
      setSaving(false);
    }
  };

  const set = (k) => (e) => setEnriched((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Add Person</h2>

        {!enriched ? (
          <>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chad Flowers"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Hints (optional)</label>
              <input
                value={hints}
                onChange={(e) => setHints(e.target.value)}
                placeholder="e.g. CTO at Acme Corp, based in Austin"
              />
            </div>
            {error && <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSearch} disabled={!name.trim() || loading}>
                {loading ? "Searching..." : "Search & Enrich"}
              </button>
              {error && (
                <button className="btn btn-secondary" onClick={() => setEnriched({ name: name.trim() })}>
                  Add Manually
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {enriched.confidence && (
              <div style={{ fontSize: "0.78rem", color: enriched.confidence === "high" ? "#22c55e" : enriched.confidence === "medium" ? "#f59e0b" : "#94a3b8", marginBottom: "0.75rem" }}>
                Confidence: {enriched.confidence}
                {enriched.sources?.length > 0 && ` · Sources: ${enriched.sources.join(", ")}`}
              </div>
            )}

            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {enriched.photo_url ? (
                <>
                  <img
                    src={enriched.photo_url}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #334155", flexShrink: 0 }}
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                  <div style={{ display: "none", width: 56, height: 56, borderRadius: "50%", background: "#334155", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", color: "#94a3b8", flexShrink: 0 }}>
                    {(enriched.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Photo found — will be saved automatically.<br />
                    You can replace it after adding.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.78rem", color: "#475569" }}>No photo found — you can upload one after adding.</div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group"><label>Name</label><input value={enriched.name || ""} onChange={set("name")} /></div>
              <div className="form-group"><label>Email</label><input value={enriched.email || ""} onChange={set("email")} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Phone</label><input value={enriched.phone || ""} onChange={set("phone")} /></div>
              <div className="form-group"><label>Location</label><input value={enriched.location || ""} onChange={set("location")} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Company</label><input value={enriched.company || ""} onChange={set("company")} /></div>
              <div className="form-group"><label>Title</label><input value={enriched.title || ""} onChange={set("title")} /></div>
            </div>
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input value={enriched.linkedin_url || ""} onChange={set("linkedin_url")} />
            </div>
            {enriched.ai_bio && (
              <div className="form-group">
                <label>AI Bio</label>
                <textarea value={enriched.ai_bio} onChange={set("ai_bio")} rows={3} />
              </div>
            )}

            {error && <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEnriched(null)}>← Back</button>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !enriched.name}>
                {saving ? "Adding..." : "Add to Network"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
