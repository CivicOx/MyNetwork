import { useEffect, useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { people as peopleApi, connections as connsApi, edgeTypes as etApi, profile as profileApi, annotations as annotationsApi } from "../api";
import PersonNode from "../components/PersonNode";
import SelfNode from "../components/SelfNode";
import TextAnnotationNode from "../components/TextAnnotationNode";
import LineAnnotationNode from "../components/LineAnnotationNode";
import FreeLineNode from "../components/FreeLineNode";
import EndpointHandleNode from "../components/EndpointHandleNode";
import PersonModal from "../components/PersonModal";
import AddPersonModal from "../components/AddPersonModal";
import AddConnectionModal from "../components/AddConnectionModal";
import EditConnectionModal from "../components/EditConnectionModal";
import EditAnnotationModal from "../components/EditAnnotationModal";
import ManageEdgeTypesModal from "../components/ManageEdgeTypesModal";
import "./NetworkView.css";

const nodeTypes = {
  person: PersonNode,
  self: SelfNode,
  text_annotation: TextAnnotationNode,
  hline: LineAnnotationNode,
  vline: LineAnnotationNode,
  line: FreeLineNode,
  ep_handle: EndpointHandleNode,
};

const LINE_PAD = 8;

function annToNode(a, onEditAnnotation, onEditEndpoints, endpointEditId) {
  if (a.kind === "line" && a.x2 != null && a.y2 != null) {
    const nx = Math.min(a.x, a.x2) - LINE_PAD;
    const ny = Math.min(a.y, a.y2) - LINE_PAD;
    const w = Math.abs(a.x2 - a.x) + LINE_PAD * 2;
    const h = Math.abs(a.y2 - a.y) + LINE_PAD * 2;
    return {
      id: `ann_${a.id}`,
      type: "line",
      position: { x: nx, y: ny },
      style: { width: w, height: h, zIndex: -1 },
      zIndex: -1,
      data: {
        sx: a.x, sy: a.y, ex: a.x2, ey: a.y2,
        color: a.color, label: a.label, annId: a.id,
        editingEndpoints: endpointEditId === a.id,
        onEdit: () => onEditAnnotation(a),
        onEditEndpoints: () => onEditEndpoints(a),
      },
      draggable: true,
      selectable: true,
    };
  }
  return {
    id: `ann_${a.id}`,
    type: a.kind === "text" ? "text_annotation" : a.kind,
    position: { x: a.x, y: a.y },
    style: { width: a.width, height: a.height, zIndex: -1 },
    zIndex: -1,
    data: { label: a.label, color: a.color, kind: a.kind, annId: a.id, onEdit: () => onEditAnnotation(a) },
    selectable: true,
  };
}

function buildGraph(people, conns, userProfile, anns, onEditAnnotation, onEditEndpoints, endpointEditId) {
  const nodes = anns.map((a) => annToNode(a, onEditAnnotation, onEditEndpoints, endpointEditId));

  if (userProfile) {
    nodes.push({
      id: "self",
      type: "self",
      position: { x: userProfile.node_x || 300, y: userProfile.node_y || 200 },
      data: { profile: userProfile },
      zIndex: 1,
    });
  }

  people.forEach((p) => {
    nodes.push({
      id: String(p.id),
      type: "person",
      position: { x: p.node_x || Math.random() * 600, y: p.node_y || Math.random() * 400 },
      data: { person: p },
      zIndex: 1,
    });
  });

  const edges = conns.map((c) => ({
    id: String(c.id),
    source: c.person_a_id === 0 ? "self" : String(c.person_a_id),
    target: c.person_b_id === 0 ? "self" : String(c.person_b_id),
    label: c.edge_type.name,
    style: { stroke: c.edge_type.color, strokeWidth: 2 },
    labelStyle: { fill: c.edge_type.color, fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: "#0f172a", fillOpacity: 0.8 },
    data: {
      connectionId: c.id,
      edge_type_id: c.edge_type.id,
      notes: c.notes || "",
      person_a_name: c.person_a?.name || String(c.person_a_id),
      person_b_name: c.person_b?.name || String(c.person_b_id),
    },
  }));

  return { nodes, edges };
}

// Inner component has access to useReactFlow()
function NetworkInner() {
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [people, setPeople] = useState([]);
  const [edgeTypeList, setEdgeTypeList] = useState([]);
  const [selectedEdgeTypeId, setSelectedEdgeTypeId] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addingConn, setAddingConn] = useState(false);
  const [editingConn, setEditingConn] = useState(null);
  const [managingTypes, setManagingTypes] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [endpointEditAnn, setEndpointEditAnn] = useState(null); // annotation being endpoint-edited

  // Line drawing state: null | { x, y } (first point placed)
  const [lineDrawMode, setLineDrawMode] = useState(false);
  const lineStart = useRef(null);
  const [linePreview, setLinePreview] = useState(null); // { x, y } cursor pos

  const endpointEditRef = useRef(null); // mirrors endpointEditAnn without closure issues

  const onEditEndpoints = useCallback((ann) => {
    endpointEditRef.current = ann;
    setEndpointEditAnn(ann);
  }, []);

  const exitEndpointEdit = useCallback(() => {
    endpointEditRef.current = null;
    setEndpointEditAnn(null);
  }, []);

  const injectHandles = useCallback((nodes, ann) => {
    if (!ann) return;
    nodes.push({
      id: `ep_start_${ann.id}`,
      type: "ep_handle",
      position: { x: ann.x - 7, y: ann.y - 7 },
      data: { color: ann.color, which: "start", annId: ann.id },
      zIndex: 10, draggable: true, selectable: false,
    });
    nodes.push({
      id: `ep_end_${ann.id}`,
      type: "ep_handle",
      position: { x: ann.x2 - 7, y: ann.y2 - 7 },
      data: { color: ann.color, which: "end", annId: ann.id },
      zIndex: 10, draggable: true, selectable: false,
    });
  }, []);

  const load = useCallback(async () => {
    const [ps, cs, ets, userProfile, anns] = await Promise.all([
      peopleApi.list(),
      connsApi.list(),
      etApi.list(),
      profileApi.get(),
      annotationsApi.list(),
    ]);
    setPeople(ps);
    setEdgeTypeList(ets);
    setSelectedEdgeTypeId((prev) => prev || String(ets[0]?.id || ""));

    const currentEpAnn = endpointEditRef.current;
    const refreshedEpAnn = currentEpAnn ? anns.find((a) => a.id === currentEpAnn.id) || null : null;
    endpointEditRef.current = refreshedEpAnn;
    setEndpointEditAnn(refreshedEpAnn);

    const { nodes: n, edges: e } = buildGraph(
      ps, cs, userProfile, anns,
      setEditingAnnotation, onEditEndpoints, refreshedEpAnn?.id ?? null
    );
    injectHandles(n, refreshedEpAnn);
    setNodes(n);
    setEdges(e);
  }, [setNodes, setEdges, onEditEndpoints, injectHandles]);

  useEffect(() => { load(); }, [load]);

  const cancelLineMode = useCallback(() => {
    setLineDrawMode(false);
    lineStart.current = null;
    setLinePreview(null);
  }, []);

  // Escape key exits both modes
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (lineDrawMode) cancelLineMode();
      if (endpointEditRef.current) exitEndpointEdit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lineDrawMode, cancelLineMode, exitEndpointEdit]);

  const onPaneClick = useCallback(async (e) => {
    if (!lineDrawMode) {
      if (endpointEditRef.current) exitEndpointEdit();
      return;
    }
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    if (!lineStart.current) {
      lineStart.current = pos;
      setLinePreview(pos);
    } else {
      const start = lineStart.current;
      cancelLineMode();
      await annotationsApi.create({
        kind: "line",
        label: "",
        color: "#475569",
        x: Math.round(start.x),
        y: Math.round(start.y),
        x2: Math.round(pos.x),
        y2: Math.round(pos.y),
        width: 0,
        height: 0,
      });
      load();
    }
  }, [lineDrawMode, screenToFlowPosition, cancelLineMode, load]);

  const onNodeDragStop = useCallback(async (_, node) => {
    if (node.id.startsWith("ep_start_") || node.id.startsWith("ep_end_")) {
      const annId = parseInt(node.id.replace(/ep_(start|end)_/, ""));
      const which = node.id.startsWith("ep_start_") ? "start" : "end";
      const cx = Math.round(node.position.x + 7);
      const cy = Math.round(node.position.y + 7);
      if (which === "start") {
        await annotationsApi.update(annId, { x: cx, y: cy });
      } else {
        await annotationsApi.update(annId, { x2: cx, y2: cy });
      }
      load();
      return;
    }
    if (node.id.startsWith("ann_")) {
      const annId = parseInt(node.id.replace("ann_", ""));
      if (node.type === "line") {
        const dx = node.position.x - (Math.min(node.data.sx, node.data.ex) - LINE_PAD);
        const dy = node.position.y - (Math.min(node.data.sy, node.data.ey) - LINE_PAD);
        await annotationsApi.update(annId, {
          x: Math.round(node.data.sx + dx), y: Math.round(node.data.sy + dy),
          x2: Math.round(node.data.ex + dx), y2: Math.round(node.data.ey + dy),
        });
      } else {
        await annotationsApi.update(annId, {
          x: Math.round(node.position.x),
          y: Math.round(node.position.y),
          width: Math.round(node.measured?.width || node.style?.width || 200),
          height: Math.round(node.measured?.height || node.style?.height || 80),
        });
      }
    } else if (node.id === "self") {
      await profileApi.update({ node_x: Math.round(node.position.x), node_y: Math.round(node.position.y) });
    } else {
      await peopleApi.update(parseInt(node.id), { node_x: Math.round(node.position.x), node_y: Math.round(node.position.y) });
    }
  }, []);

  const onNodeClick = useCallback((_, node) => {
    if (lineDrawMode) return;
    if (node.id.startsWith("ep_")) return;
    if (node.id !== "self" && !node.id.startsWith("ann_")) setSelectedPerson(node.data.person);
  }, [lineDrawMode]);

  const onConnect = useCallback(async (params) => {
    if (lineDrawMode) return;
    const edgeTypeId = parseInt(selectedEdgeTypeId);
    if (!edgeTypeId) return;
    const sourceId = params.source === "self" ? 0 : parseInt(params.source);
    const targetId = params.target === "self" ? 0 : parseInt(params.target);
    if (sourceId === targetId) return;
    if (params.source?.startsWith("ann_") || params.target?.startsWith("ann_")) return;
    if (params.source?.startsWith("ep_") || params.target?.startsWith("ep_")) return;
    try {
      await connsApi.create({ person_a_id: sourceId, person_b_id: targetId, edge_type_id: edgeTypeId });
      load();
    } catch (e) {
      console.error("Failed to create connection", e);
    }
  }, [selectedEdgeTypeId, lineDrawMode, load]);

  const onEdgeClick = useCallback((_, edge) => {
    if (lineDrawMode) return;
    setEditingConn({
      connectionId: edge.data.connectionId,
      edge_type_id: edge.data.edge_type_id,
      notes: edge.data.notes,
      person_a_name: edge.data.person_a_name,
      person_b_name: edge.data.person_b_name,
    });
  }, [lineDrawMode]);

  const onNodeResizeEnd = useCallback(async (_, node) => {
    if (!node.id.startsWith("ann_")) return;
    const annId = parseInt(node.id.replace("ann_", ""));
    await annotationsApi.update(annId, {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      width: Math.round(node.measured?.width || 200),
      height: Math.round(node.measured?.height || 80),
    });
  }, []);

  const addTextBox = useCallback(async () => {
    await annotationsApi.create({ kind: "text", label: "Label", color: "#334155", x: 200, y: 200, width: 220, height: 100 });
    load();
  }, [load]);

  const selectedEdgeType = edgeTypeList.find((e) => e.id === parseInt(selectedEdgeTypeId));

  return (
    <div className="network-view">
      <div className="network-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {selectedEdgeType && (
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: selectedEdgeType.color, flexShrink: 0 }} />
          )}
          <select
            value={selectedEdgeTypeId}
            onChange={(e) => setSelectedEdgeTypeId(e.target.value)}
            style={{ fontSize: "0.85rem", padding: "0.3rem 0.5rem", background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 6 }}
          >
            {edgeTypeList.map((et) => (
              <option key={et.id} value={et.id}>{et.name}</option>
            ))}
          </select>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>← drag between nodes to connect</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {lineDrawMode ? (
            <>
              <span style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: 600 }}>
                {lineStart.current ? "Click second endpoint…" : "Click first endpoint…"}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={cancelLineMode}>✕ Cancel</button>
            </>
          ) : (
            <>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Annotate:</span>
              <button className="btn btn-ghost btn-sm" onClick={addTextBox} title="Add a labeled area box">⬜ Text Box</button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { lineStart.current = null; setLineDrawMode(true); }}
                title="Click two points on the canvas to draw a line"
              >
                ╱ Draw Line
              </button>
              <div style={{ width: 1, height: 20, background: "#334155" }} />
              <button className="btn btn-ghost btn-sm" onClick={() => setManagingTypes(true)}>⚙ Types</button>
              <button className="btn btn-secondary" onClick={() => setAddingConn(true)}>+ Connection</button>
              <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Person</button>
            </>
          )}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeResizeEnd={onNodeResizeEnd}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        style={{ cursor: lineDrawMode ? "crosshair" : undefined }}
      >
        <Background color="#1e293b" gap={24} />
        <Controls />
        <MiniMap nodeColor="#334155" maskColor="rgba(0,0,0,0.4)" />
      </ReactFlow>

      {selectedPerson && (
        <PersonModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onSave={async (updated) => {
            await peopleApi.update(selectedPerson.id, updated);
            setSelectedPerson(null);
            load();
          }}
          onDelete={async () => {
            await peopleApi.delete(selectedPerson.id);
            setSelectedPerson(null);
            load();
          }}
        />
      )}
      {adding && (
        <AddPersonModal
          onClose={() => setAdding(false)}
          onSave={async (data) => {
            await peopleApi.create(data);
            setAdding(false);
            load();
          }}
        />
      )}
      {addingConn && (
        <AddConnectionModal
          people={people}
          edgeTypes={edgeTypeList}
          onClose={() => setAddingConn(false)}
          onSave={async (data) => {
            await connsApi.create(data);
            setAddingConn(false);
            load();
          }}
        />
      )}
      {managingTypes && (
        <ManageEdgeTypesModal
          edgeTypes={edgeTypeList}
          onClose={() => setManagingTypes(false)}
          onChanged={(updated) => {
            setEdgeTypeList(updated);
            setSelectedEdgeTypeId((prev) => {
              const still = updated.find((e) => String(e.id) === prev);
              return still ? prev : String(updated[0]?.id || "");
            });
          }}
        />
      )}
      {editingConn && (
        <EditConnectionModal
          connection={editingConn}
          edgeTypes={edgeTypeList}
          onClose={() => setEditingConn(null)}
          onSave={async (data) => {
            await connsApi.update(editingConn.connectionId, data);
            setEditingConn(null);
            load();
          }}
          onDelete={async () => {
            await connsApi.delete(editingConn.connectionId);
            setEditingConn(null);
            load();
          }}
        />
      )}
      {editingAnnotation && (
        <EditAnnotationModal
          annotation={editingAnnotation}
          onClose={() => setEditingAnnotation(null)}
          onSave={async (data) => {
            await annotationsApi.update(editingAnnotation.id, data);
            setEditingAnnotation(null);
            load();
          }}
          onDelete={async () => {
            await annotationsApi.delete(editingAnnotation.id);
            setEditingAnnotation(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function NetworkView() {
  return (
    <ReactFlowProvider>
      <NetworkInner />
    </ReactFlowProvider>
  );
}
