import { memo } from "react";

function EndpointHandleNode({ data }) {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: data.color || "#475569",
        border: "2px solid #fff",
        boxShadow: "0 0 0 2px " + (data.color || "#475569"),
        cursor: "grab",
        boxSizing: "border-box",
      }}
      title="Drag to move endpoint"
    />
  );
}

export default memo(EndpointHandleNode);
