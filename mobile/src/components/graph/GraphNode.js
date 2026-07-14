import { useRef, useEffect } from 'react';
import { Text, StyleSheet, Animated, PanResponder } from 'react-native';

const NODE_W = 120;
const NODE_H = 50;
const SELF_SIZE = 72;

export default function GraphNode({
  node, scaleRef, isSource,
  onPress, onDragEnd, onDragStart, onDragFinish,
}) {
  const nodeRef = useRef(node);
  useEffect(() => { nodeRef.current = node; }, [node]);

  const cb = useRef({ onPress, onDragEnd, onDragStart, onDragFinish });
  useEffect(() => { cb.current = { onPress, onDragEnd, onDragStart, onDragFinish }; });

  const posX = useRef(new Animated.Value(node.graphX)).current;
  const posY = useRef(new Animated.Value(node.graphY)).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  const isDragging = useRef(false);
  const touchStart = useRef(0);

  useEffect(() => {
    if (!isDragging.current) {
      posX.setValue(node.graphX);
      posY.setValue(node.graphY);
    }
  }, [node.graphX, node.graphY]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        touchStart.current = Date.now();

        posX.setOffset(nodeRef.current.graphX);
        posY.setOffset(nodeRef.current.graphY);
        posX.setValue(0);
        posY.setValue(0);

        Animated.spring(dragScale, { toValue: 1.2, useNativeDriver: false, friction: 5, tension: 300 }).start();
        cb.current.onDragStart();
      },
      onPanResponderMove: (_, gs) => {
        const s = scaleRef ? scaleRef.current : 1;
        posX.setValue(gs.dx / s);
        posY.setValue(gs.dy / s);
      },
      onPanResponderRelease: (_, gs) => {
        posX.flattenOffset();
        posY.flattenOffset();
        isDragging.current = false;
        Animated.spring(dragScale, { toValue: 1, useNativeDriver: false, friction: 5, tension: 300 }).start();
        cb.current.onDragFinish();

        const elapsed = Date.now() - touchStart.current;
        const dist = Math.sqrt(gs.dx * gs.dx + gs.dy * gs.dy);

        if (elapsed < 260 && dist < 12) {
          posX.setValue(nodeRef.current.graphX);
          posY.setValue(nodeRef.current.graphY);
          cb.current.onPress(nodeRef.current);
        } else {
          cb.current.onDragEnd(nodeRef.current.id, posX._value, posY._value);
        }
      },
      onPanResponderTerminate: () => {
        posX.flattenOffset();
        posY.flattenOffset();
        posX.setValue(nodeRef.current.graphX);
        posY.setValue(nodeRef.current.graphY);
        isDragging.current = false;
        Animated.spring(dragScale, { toValue: 1, useNativeDriver: false, friction: 5, tension: 300 }).start();
        cb.current.onDragFinish();
      },
    }),
  ).current;

  const isSelf = node.isSelf;
  const w = isSelf ? SELF_SIZE : NODE_W;
  const h = isSelf ? SELF_SIZE : NODE_H;

  return (
    <Animated.View
      style={[
        isSelf ? s.selfNode : s.personNode,
        isSource && s.sourceNode,
        {
          position: 'absolute',
          left: -w / 2,
          top: -h / 2,
          width: w,
          height: h,
          transform: [{ translateX: posX }, { translateY: posY }, { scale: dragScale }],
        },
      ]}
      {...responder.panHandlers}
    >
      <Text style={isSelf ? s.selfLabel : s.nodeLabel} numberOfLines={1}>
        {node.label}
      </Text>
      {!isSelf && node.sub ? (
        <Text style={s.nodeSub} numberOfLines={1}>{node.sub}</Text>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  personNode: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  selfNode: {
    borderRadius: SELF_SIZE / 2,
    backgroundColor: '#1e293b',
    borderWidth: 2.5,
    borderColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  sourceNode: {
    borderColor: '#22d3ee',
    borderWidth: 3,
    shadowColor: '#22d3ee',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 14,
  },
  nodeLabel: { color: '#f1f5f9', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  selfLabel: { color: '#f59e0b', fontSize: 10, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  nodeSub: { color: '#64748b', fontSize: 9, textAlign: 'center', marginTop: 2 },
});
