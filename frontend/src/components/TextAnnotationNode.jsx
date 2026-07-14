import { memo } from "react";
import { NodeResizer } from "@xyflow/react";

function TextAnnotationNode({ data, selected }) {
  return (
    <>
      <NodeResizer minWidth={120} minHeight={50} isVisible={selected} />
      <div
        onDoubleClick={data.onEdit}
        style={{
          width: "100%",
          height: "100%",
          border: `2px dashed ${data.color || "#475569"}`,
          borderRadius: 10,
          background: `${data.color || "#475569"}18`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          padding: "8px 12px",
          cursor: "default",
          boxSizing: "border-box",
          userSelect: "none",
        }}
      >
        <span style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          color: data.color || "#94a3b8",
          letterSpacing: "0.03em",
          pointerEvents: "none",
        }}>
          {data.label || "Label"}
        </span>
      </div>
    </>
  );
}

export default memo(TextAnnotationNode);
