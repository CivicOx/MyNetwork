import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, Text } from 'react-native';
import GraphNode from './GraphNode';

const { width: SW, height: SH } = Dimensions.get('window');
const WORLD = 5000;
const HALF = WORLD / 2;
const INIT_VX = SW / 2 - 300;
const INIT_VY = SH / 2 - 250;
const SCALE_MIN = 0.2;
const SCALE_MAX = 4;
const FIT_PADDING = 64;

// Node half-dimensions (must match GraphNode.js constants)
const NODE_HW = 76;
const NODE_HH = 27;
const SELF_HR = 36;

// Size of the midpoint edit button in world coordinate units
const MID_BTN = 50;

const GraphCanvas = forwardRef(function GraphCanvas(
  { nodes, edges, onNodePress, onDragEnd, onEdgePress, edgeCreatingSourceId },
  ref,
) {
  const vpX = useRef(INIT_VX);
  const vpY = useRef(INIT_VY);
  const scaleVal = useRef(1);

  const vpAnim = useRef(new Animated.ValueXY({ x: INIT_VX, y: INIT_VY })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const nodeDragging = useRef(false);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useImperativeHandle(ref, () => ({
    handleWheel(e) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const oldScale = scaleVal.current;
      const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, oldScale * factor));
      const r = newScale / oldScale;
      vpX.current = (e.clientX - HALF) * (1 - r) + r * vpX.current;
      vpY.current = (e.clientY - HALF) * (1 - r) + r * vpY.current;
      scaleVal.current = newScale;
      vpAnim.setValue({ x: vpX.current, y: vpY.current });
      scaleAnim.setValue(newScale);
    },
    fitToScreen() {
      const all = nodesRef.current;
      if (all.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      all.forEach((n) => {
        const hw = n.isSelf ? SELF_HR : NODE_HW;
        const hh = n.isSelf ? SELF_HR : NODE_HH;
        minX = Math.min(minX, n.graphX - hw);
        maxX = Math.max(maxX, n.graphX + hw);
        minY = Math.min(minY, n.graphY - hh);
        maxY = Math.max(maxY, n.graphY + hh);
      });

      const boxW = maxX - minX;
      const boxH = maxY - minY;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const targetScale = Math.max(
        SCALE_MIN,
        Math.min(
          SCALE_MAX,
          Math.min(
            (SW - 2 * FIT_PADDING) / Math.max(boxW, 1),
            (SH - 2 * FIT_PADDING) / Math.max(boxH, 1),
          ),
        ),
      );

      const tx = SW / 2 - cx * targetScale - HALF * (1 - targetScale);
      const ty = SH / 2 - cy * targetScale - HALF * (1 - targetScale);

      vpX.current = tx;
      vpY.current = ty;
      scaleVal.current = targetScale;

      Animated.parallel([
        Animated.spring(vpAnim, { toValue: { x: tx, y: ty }, useNativeDriver: false, friction: 7, tension: 50 }),
        Animated.spring(scaleAnim, { toValue: targetScale, useNativeDriver: false, friction: 7, tension: 50 }),
      ]).start();
    },
  }));

  const pinch = useRef({
    active: false, startDist: 1, startScale: 1,
    startVpX: INIT_VX, startVpY: INIT_VY, startMidX: 0, startMidY: 0,
  });
  const panStart = useRef({ x: INIT_VX, y: INIT_VY });

  const canvasResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !nodeDragging.current,
      onPanResponderGrant: () => {
        pinch.current.active = false;
        panStart.current = { x: vpX.current, y: vpY.current };
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          const t0 = touches[0], t1 = touches[1];
          const dist = Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
          const midX = (t0.pageX + t1.pageX) / 2;
          const midY = (t0.pageY + t1.pageY) / 2;

          if (!pinch.current.active) {
            pinch.current = {
              active: true,
              startDist: Math.max(dist, 1),
              startScale: scaleVal.current,
              startVpX: vpX.current,
              startVpY: vpY.current,
              startMidX: midX,
              startMidY: midY,
            };
            return;
          }

          const rawNewScale = pinch.current.startScale * (dist / pinch.current.startDist);
          const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, rawNewScale));
          const r = newScale / pinch.current.startScale;
          const newVpX = (pinch.current.startMidX - HALF) * (1 - r) + r * pinch.current.startVpX;
          const newVpY = (pinch.current.startMidY - HALF) * (1 - r) + r * pinch.current.startVpY;

          vpX.current = newVpX;
          vpY.current = newVpY;
          scaleVal.current = newScale;
          vpAnim.setValue({ x: newVpX, y: newVpY });
          scaleAnim.setValue(newScale);
        } else if (!pinch.current.active) {
          const newX = panStart.current.x + gs.dx;
          const newY = panStart.current.y + gs.dy;
          vpX.current = newX;
          vpY.current = newY;
          vpAnim.setValue({ x: newX, y: newY });
        }
      },
      onPanResponderRelease: () => { pinch.current.active = false; },
      onPanResponderTerminate: () => { pinch.current.active = false; },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const nodePos = {};
  nodes.forEach((n) => { nodePos[n.id] = { x: n.graphX, y: n.graphY }; });

  return (
    <View style={[StyleSheet.absoluteFill, s.bg]}>
      {/* Canvas pan/pinch responder — fullscreen, behind the world */}
      <View style={StyleSheet.absoluteFill} {...canvasResponder.panHandlers} />

      <Animated.View
        style={[s.world, {
          transform: [
            { translateX: vpAnim.x },
            { translateY: vpAnim.y },
            { scale: scaleAnim },
          ],
        }]}
        pointerEvents="box-none"
      >
        {/* Edges — rotated React Native Views, no SVG needed.
            Each line is a thin rectangle rotated around its midpoint. */}
        {edges.map((edge) => {
          const src = nodePos[edge.sourceId];
          const tgt = nodePos[edge.targetId];
          if (!src || !tgt) return null;

          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const len = Math.hypot(dx, dy);
          if (len < 1) return null;

          const angle = Math.atan2(dy, dx);
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;

          return (
            <View
              key={edge.id}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: midX - len / 2,
                top: midY - 1.5,
                width: len,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: edge.color || '#475569',
                opacity: 0.85,
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
          );
        })}

        {/* Edge midpoint tap buttons */}
        {onEdgePress && edges.map((edge) => {
          const src = nodePos[edge.sourceId];
          const tgt = nodePos[edge.targetId];
          if (!src || !tgt) return null;
          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          return (
            <TouchableOpacity
              key={`mid-${edge.id}`}
              style={[s.edgeMidBtn, {
                left: midX - MID_BTN / 2,
                top: midY - MID_BTN / 2,
                backgroundColor: edge.color + 'cc',
                borderColor: edge.color,
              }]}
              onPress={() => onEdgePress(edge)}
              activeOpacity={0.7}
            >
              <Text style={s.edgeMidText}>✎</Text>
            </TouchableOpacity>
          );
        })}

        {/* Nodes — rendered on top of edges */}
        {nodes.map((node) => (
          <GraphNode
            key={node.id}
            node={node}
            scaleRef={scaleVal}
            isSource={node.id === edgeCreatingSourceId}
            onPress={onNodePress}
            onDragEnd={onDragEnd}
            onDragStart={() => { nodeDragging.current = true; }}
            onDragFinish={() => { nodeDragging.current = false; }}
          />
        ))}
      </Animated.View>
    </View>
  );
});

export default GraphCanvas;

const s = StyleSheet.create({
  bg: { backgroundColor: '#0f172a' },
  world: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: WORLD,
    height: WORLD,
    overflow: 'visible',
  },
  edgeMidBtn: {
    position: 'absolute',
    width: MID_BTN,
    height: MID_BTN,
    borderRadius: MID_BTN / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  edgeMidText: { color: '#fff', fontSize: 14 },
});
