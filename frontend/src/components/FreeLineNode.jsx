import { memo, useRef } from "react";

const PAD = 8;

function FreeLineNode({ data, selected }) {
  const { sx, sy, ex, ey, color, label, editingEndpoints } = data;
  const clickTimer = useRef(null);
  const w = Math.abs(ex - sx) + PAD * 2;
  const h = Math.abs(ey - sy) + PAD * 2;
  const x1 = sx < ex ? PAD : w - PAD;
  const y1 = sy < ey ? PAD : h - PAD;
  const x2 = sx < ex ? w - PAD : PAD;
  const y2 = sy < ey ? h - PAD : PAD;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const handleClick = (e) => {
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      data.onEdit?.();
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        data.onEditEndpoints?.();
      }, 220);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: w, height: h, position: "relative", cursor: "default",
        outline: editingEndpoints ? `2px solid ${color || "#475569"}` : "none",
        outlineOffset: 4, borderRadius: 4,
      }}
    >
      <svg
        width={w}
        height={h}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
      >
        {selected && (
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#fff"
            strokeWidth={6}
            strokeOpacity={0.25}
            strokeLinecap="round"
          />
        )}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color || "#475569"}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {label && (
          <>
            <rect
              x={mx - label.length * 3.5 - 4}
              y={my - 9}
              width={label.length * 7 + 8}
              height={18}
              rx={4}
              fill="#0f172a"
            />
            <text
              x={mx} y={my + 4}
              textAnchor="middle"
              fill={color || "#94a3b8"}
              fontSize={12}
              fontWeight={600}
              fontFamily="inherit"
            >
              {label}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default memo(FreeLineNode);
