import { Handle, Position } from "@xyflow/react";
import "./PersonNode.css";

export default function PersonNode({ data }) {
  const { person } = data;
  const src = person.photo_path
    ? `http://localhost:8000/${person.photo_path}`
    : person.photo_url;

  return (
    <div className="person-node">
      <Handle type="target" position={Position.Top} />
      <div className="pn-avatar">
        {src ? (
          <img src={src} alt={person.name} onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
          <span>{person.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="pn-info">
        <div className="pn-name">{person.name}</div>
        {person.title && <div className="pn-title">{person.title}</div>}
        {person.company && <div className="pn-company">{person.company}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
