import { memo } from "react";
import { NodeResizer } from "@xyflow/react";

function LineAnnotationNode({ data, selected }) {
  const isVertical = data.kind === "vline";
  return (
    <>
      <NodeResizer
        minWidth={isVertical ? 12 : 60}
        minHeight={isVertical ? 60 : 12}
        isVisible={selected}
      />
      <div
        onDoubleClick={data.onEdit}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "default",
        }}
      >
        <div style={{
          background: data.color || "#475569",
          width: isVertical ? 3 : "100%",
          height: isVertical ? "100%" : 3,
          borderRadius: 2,
          pointerEvents: "none",
        }} />
        {data.label && (
          <span style={{
            position: "absolute",
            fontSize: "0.75rem",
            color: data.color || "#94a3b8",
            fontWeight: 600,
            background: "#0f172a",
            padding: "1px 6px",
            borderRadius: 4,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            {data.label}
          </span>
        )}
      </div>
    </>
  );
}

export default memo(LineAnnotationNode);
