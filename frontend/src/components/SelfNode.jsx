import { Handle, Position } from "@xyflow/react";
import { useNavigate } from "react-router-dom";
import "./SelfNode.css";

export default function SelfNode({ data }) {
  const { profile } = data;
  const navigate = useNavigate();
  const src = profile.photo_path ? `http://localhost:8000/${profile.photo_path}` : null;
  const initials = (profile.name || "Me").charAt(0).toUpperCase();

  return (
    <div className="self-node" onDoubleClick={() => navigate("/profile")} title="Double-click to edit your profile">
      <Handle type="target" position={Position.Top} />
      <div className="self-avatar">
        {src
          ? <img src={src} alt="You" onError={(e) => { e.target.style.display = "none"; }} />
          : <span>{initials}</span>}
      </div>
      <div className="self-info">
        <div className="self-name">{profile.name || "You"}</div>
        {profile.title && <div className="self-title">{profile.title}</div>}
        <div className="self-badge">You</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
