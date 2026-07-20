import { useRef, useEffect } from 'react';
import { Text, View, Image, StyleSheet, Animated, PanResponder, Platform } from 'react-native';

const NODE_W = 152;
const NODE_H = 54;
const SELF_SIZE = 72;
const AVATAR = 38; // photo circle diameter inside person node

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

  // Web-only: window-level mouse drag so fast mouse movement can't escape the node.
  const webDrag = useRef({ startX: 0, startY: 0, startNodeX: 0, startNodeY: 0 });
  const webMouseHandlers = Platform.OS === 'web' ? {
    onMouseDown: (e) => {
      e.preventDefault();
      webDrag.current = {
        startX: e.clientX,
        startY: e.clientY,
        startNodeX: nodeRef.current.graphX,
        startNodeY: nodeRef.current.graphY,
      };
      touchStart.current = Date.now();
      isDragging.current = true;
      posX.setValue(nodeRef.current.graphX);
      posY.setValue(nodeRef.current.graphY);
      Animated.spring(dragScale, { toValue: 1.2, useNativeDriver: false, friction: 5, tension: 300 }).start();
      cb.current.onDragStart();

      const onMove = (me) => {
        const sc = scaleRef ? scaleRef.current : 1;
        posX.setValue(webDrag.current.startNodeX + (me.clientX - webDrag.current.startX) / sc);
        posY.setValue(webDrag.current.startNodeY + (me.clientY - webDrag.current.startY) / sc);
      };

      const onUp = (me) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        const sc = scaleRef ? scaleRef.current : 1;
        const dx = (me.clientX - webDrag.current.startX) / sc;
        const dy = (me.clientY - webDrag.current.startY) / sc;
        const finalX = webDrag.current.startNodeX + dx;
        const finalY = webDrag.current.startNodeY + dy;
        isDragging.current = false;
        Animated.spring(dragScale, { toValue: 1, useNativeDriver: false, friction: 5, tension: 300 }).start();
        cb.current.onDragFinish();
        const elapsed = Date.now() - touchStart.current;
        const dist = Math.hypot(dx, dy);
        if (elapsed < 260 && dist < 12) {
          posX.setValue(nodeRef.current.graphX);
          posY.setValue(nodeRef.current.graphY);
          cb.current.onPress(nodeRef.current);
        } else {
          posX.setValue(finalX);
          posY.setValue(finalY);
          cb.current.onDragEnd(nodeRef.current.id, finalX, finalY);
        }
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
  } : {};

  const isSelf = node.isSelf;
  const w = isSelf ? SELF_SIZE : NODE_W;
  const h = isSelf ? SELF_SIZE : NODE_H;
  const photoUrl = node.data?.photo_url;

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
      {...(Platform.OS !== 'web' ? responder.panHandlers : webMouseHandlers)}
    >
      {isSelf ? (
        // Self node: photo fills the circle, falls back to label
        photoUrl ? (
          <Image source={{ uri: photoUrl }} style={s.selfPhoto} />
        ) : (
          <Text style={s.selfLabel} numberOfLines={1}>{node.label}</Text>
        )
      ) : (
        // Person node: photo on left, name + title on right
        <>
          <View style={s.avatarCol}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>
                  {(node.label || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={s.textCol}>
            <Text style={s.nodeLabel} numberOfLines={1}>{node.label}</Text>
            {node.sub ? <Text style={s.nodeSub} numberOfLines={1}>{node.sub}</Text> : null}
          </View>
        </>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  personNode: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
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
    overflow: 'hidden',
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

  // Self node photo
  selfPhoto: {
    width: SELF_SIZE,
    height: SELF_SIZE,
    borderRadius: SELF_SIZE / 2,
  },
  selfLabel: { color: '#f59e0b', fontSize: 10, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },

  // Person node layout
  avatarCol: {
    width: AVATAR + 10,
    height: NODE_H,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },

  textCol: {
    flex: 1,
    paddingHorizontal: 7,
    justifyContent: 'center',
  },
  nodeLabel: { color: '#f1f5f9', fontSize: 11, fontWeight: '600' },
  nodeSub: { color: '#64748b', fontSize: 9, marginTop: 2 },
});
