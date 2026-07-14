import { useEffect, useState, useRef } from "react";
import { profile as profileApi, ai } from "../api";
import "./ProfileView.css";

const EMPTY_EDU = { school: "", degree: "", field: "", graduation_year: "" };
const EMPTY_WORK = { company: "", title: "", start: "", end: "", description: "" };

export default function ProfileView() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState("");
  const fileRef = useRef();
  const resumeRef = useRef();

  useEffect(() => {
    profileApi.get().then((p) => setForm({
      ...p,
      education: p.education || [],
      work_history: p.work_history || [],
    }));
  }, []);

  if (!form) return <div className="profile-loading">Loading...</div>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setEdu = (i, k) => (e) => {
    const updated = form.education.map((item, idx) =>
      idx === i ? { ...item, [k]: e.target.value } : item
    );
    setForm((f) => ({ ...f, education: updated }));
  };

  const setWork = (i, k) => (e) => {
    const updated = form.work_history.map((item, idx) =>
      idx === i ? { ...item, [k]: e.target.value } : item
    );
    setForm((f) => ({ ...f, work_history: updated }));
  };

  const handleAutofill = async () => {
    setAutofilling(true);
    setAutofillError("");
    try {
      const parsed = await ai.parseResume();
      setForm((f) => ({
        ...f,
        name:         parsed.name         || f.name,
        email:        parsed.email        || f.email,
        phone:        parsed.phone        || f.phone,
        linkedin_url: parsed.linkedin_url || f.linkedin_url,
        location:     parsed.location     || f.location,
        title:        parsed.title        || f.title,
        company:      parsed.company      || f.company,
        bio:          parsed.bio          || f.bio,
        skills:       parsed.skills       || f.skills,
        education:    parsed.education?.length ? parsed.education : f.education,
        work_history: parsed.work_history?.length ? parsed.work_history : f.work_history,
      }));
    } catch (e) {
      setAutofillError(e?.response?.data?.detail || "Auto-fill failed — make sure your resume is uploaded and your OpenAI key is set.");
    } finally {
      setAutofilling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await profileApi.update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e?.response?.data?.detail || "Save failed — is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const updated = await profileApi.uploadPhoto(file);
    setForm((f) => ({ ...f, photo_path: updated.photo_path }));
  };

  const photoSrc = form.photo_path ? `http://localhost:8000/${form.photo_path}` : null;

  return (
    <div className="profile-view">
      <div className="profile-scroll">
        <div className="profile-header">
          <div className="profile-avatar" onClick={() => fileRef.current?.click()} title="Click to change photo">
            {photoSrc
              ? <img src={photoSrc} alt="You" />
              : <span>{(form.name || "?").charAt(0).toUpperCase()}</span>}
            <div className="avatar-overlay">Change</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
          <div>
            <h1>{form.name || "Your Profile"}</h1>
            {form.title && <p className="profile-subtitle">{form.title}{form.company ? ` · ${form.company}` : ""}</p>}
          </div>
        </div>

        {/* Contact Info */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Contact Information</h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleAutofill}
              disabled={autofilling || !form.resume_text}
              title={!form.resume_text ? "Upload a resume first" : "Fill fields from your uploaded resume"}
            >
              {autofilling ? "Filling…" : "✨ Auto-fill from Resume"}
            </button>
          </div>
          {autofillError && <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{autofillError}</p>}
          <div className="field-grid">
            <div className="form-group"><label>Full Name</label><input value={form.name || ""} onChange={set("name")} placeholder="Your name" /></div>
            <div className="form-group"><label>Email</label><input value={form.email || ""} onChange={set("email")} placeholder="you@example.com" /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone || ""} onChange={set("phone")} placeholder="+1 (555) 000-0000" /></div>
            <div className="form-group"><label>Location</label><input value={form.location || ""} onChange={set("location")} placeholder="City, State" /></div>
            <div className="form-group"><label>LinkedIn URL</label><input value={form.linkedin_url || ""} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/..." /></div>
            <div className="form-group"><label>Current Title</label><input value={form.title || ""} onChange={set("title")} placeholder="Software Engineer" /></div>
            <div className="form-group"><label>Current Company</label><input value={form.company || ""} onChange={set("company")} placeholder="Acme Corp" /></div>
          </div>
        </section>

        {/* Bio & Skills */}
        <section className="profile-section">
          <h2>About</h2>
          <div className="form-group">
            <label>Bio</label>
            <textarea value={form.bio || ""} onChange={set("bio")} rows={4} placeholder="A short summary about yourself — used to improve connection recommendations." />
          </div>
          <div className="form-group">
            <label>Skills</label>
            <input value={form.skills || ""} onChange={set("skills")} placeholder="e.g. Python, Product Management, Machine Learning (comma-separated)" />
          </div>
        </section>

        {/* Education */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Education</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setForm((f) => ({ ...f, education: [...f.education, { ...EMPTY_EDU }] }))}>
              + Add
            </button>
          </div>
          {form.education.length === 0 && <p className="empty-hint">No education added yet.</p>}
          {form.education.map((edu, i) => (
            <div className="entry-card" key={i}>
              <div className="entry-card-top">
                <span className="entry-num">#{i + 1}</span>
                <button className="btn btn-ghost btn-sm remove-btn" onClick={() => setForm((f) => ({ ...f, education: f.education.filter((_, idx) => idx !== i) }))}>Remove</button>
              </div>
              <div className="field-grid">
                <div className="form-group"><label>School</label><input value={edu.school} onChange={setEdu(i, "school")} placeholder="University of Texas" /></div>
                <div className="form-group"><label>Degree</label><input value={edu.degree} onChange={setEdu(i, "degree")} placeholder="B.S., M.S., Ph.D." /></div>
                <div className="form-group"><label>Field of Study</label><input value={edu.field} onChange={setEdu(i, "field")} placeholder="Computer Science" /></div>
                <div className="form-group"><label>Graduation Year</label><input value={edu.graduation_year} onChange={setEdu(i, "graduation_year")} placeholder="2021" /></div>
              </div>
            </div>
          ))}
        </section>

        {/* Work History */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Work History</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setForm((f) => ({ ...f, work_history: [...f.work_history, { ...EMPTY_WORK }] }))}>
              + Add
            </button>
          </div>
          {form.work_history.length === 0 && <p className="empty-hint">No work history added yet.</p>}
          {form.work_history.map((job, i) => (
            <div className="entry-card" key={i}>
              <div className="entry-card-top">
                <span className="entry-num">#{i + 1}</span>
                <button className="btn btn-ghost btn-sm remove-btn" onClick={() => setForm((f) => ({ ...f, work_history: f.work_history.filter((_, idx) => idx !== i) }))}>Remove</button>
              </div>
              <div className="field-grid">
                <div className="form-group"><label>Company</label><input value={job.company} onChange={setWork(i, "company")} placeholder="Acme Corp" /></div>
                <div className="form-group"><label>Title</label><input value={job.title} onChange={setWork(i, "title")} placeholder="Software Engineer" /></div>
                <div className="form-group"><label>Start</label><input value={job.start} onChange={setWork(i, "start")} placeholder="Jan 2020" /></div>
                <div className="form-group"><label>End</label><input value={job.end} onChange={setWork(i, "end")} placeholder="Present" /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea value={job.description} onChange={setWork(i, "description")} rows={2} placeholder="Key responsibilities or achievements..." /></div>
            </div>
          ))}
        </section>

        {/* Resume */}
        <section className="profile-section">
          <h2>Resume</h2>
          <div className="resume-upload-area" onClick={() => resumeRef.current?.click()}>
            <input
              ref={resumeRef}
              type="file"
              accept=".pdf,.docx"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setResumeUploading(true);
                setResumeError("");
                setResumeFileName(file.name);
                try {
                  const updated = await profileApi.uploadResume(file);
                  setForm((f) => ({ ...f, resume_text: updated.resume_text }));
                } catch (err) {
                  setResumeError(err?.response?.data?.detail || "Upload failed");
                  setResumeFileName("");
                } finally {
                  setResumeUploading(false);
                  e.target.value = "";
                }
              }}
            />
            {resumeUploading ? (
              <p className="resume-status">Extracting text…</p>
            ) : resumeFileName || form.resume_text ? (
              <p className="resume-status resume-ok">
                ✓ {resumeFileName || "Resume loaded"} — click to replace
              </p>
            ) : (
              <>
                <p className="resume-drop-icon">📄</p>
                <p className="resume-drop-label">Click to upload your resume</p>
                <p className="resume-drop-hint">.pdf or .docx — text is extracted and used privately by the AI</p>
              </>
            )}
          </div>
          {resumeError && <p className="resume-error">{resumeError}</p>}
          {form.resume_text && (
            <details className="resume-preview">
              <summary>Preview extracted text</summary>
              <pre>{form.resume_text}</pre>
            </details>
          )}
        </section>

        <div className="profile-save-bar">
          {saveError && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{saveError}</p>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
