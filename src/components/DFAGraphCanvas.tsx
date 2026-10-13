import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { DFADefinition, MinimizedDFA, PartitionGroup } from '../utils/dfaEngine';

export interface ActiveEdgeAnimation {
  from: string;
  to: string;
  symbol: string;
}

export interface StringTraceHighlight {
  visitedStates: string[];
  traversedEdges: { from: string; to: string; symbol: string }[];
  currentState: string | null;
  activeEdge: ActiveEdgeAnimation | null;
  isAccepted: boolean;
}

interface DFAGraphCanvasProps {
  title?: string;
  subtitle?: string;
  dfa: DFADefinition | MinimizedDFA;
  isMinimizedGraph?: boolean;
  unreachableStates?: string[];
  visitedStates?: string[];
  removedStates?: string[];
  activeState?: string | null;
  selectedState?: string | null;
  highlightedStates?: string[];
  activeEdge?: ActiveEdgeAnimation | null;
  selectedEdge?: { from: string; to: string } | null;
  stringTrace?: StringTraceHighlight | null;
  partitionGroups?: PartitionGroup[];
  mergingGroups?: PartitionGroup[] | null;
  speedMultiplier?: number;
  compact?: boolean;
  onSelectState?: (state: string | null) => void;
  onSelectEdge?: (edge: { from: string; to: string } | null) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  isInitial: boolean;
  isFinal: boolean;
  isUnreachable: boolean;
  isRemoved: boolean;
  isVisited: boolean;
  groupId?: string;
  groupColor?: string;
  membersLabel?: string;
}

interface GroupedEdge {
  id: string;
  from: string;
  to: string;
  symbols: string[];
  isSelfLoop: boolean;
  hasReverseEdge: boolean;
  isUnreachable: boolean;
}

export const DFAGraphCanvas: React.FC<DFAGraphCanvasProps> = ({
  title,
  subtitle,
  dfa,
  isMinimizedGraph = false,
  unreachableStates = [],
  visitedStates = [],
  removedStates = [],
  activeState = null,
  selectedState = null,
  highlightedStates = [],
  activeEdge = null,
  selectedEdge = null,
  stringTrace = null,
  partitionGroups = [],
  speedMultiplier = 1,
  compact = false,
  onSelectState,
  onSelectEdge,
}) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  const width = compact ? 520 : 680;
  const height = compact ? 310 : 350;
  const nodeRadius = compact ? 25 : 27;

  const stateToGroupMap = useMemo(() => {
    const map: Record<string, { id: string; color: string }> = {};
    for (const grp of partitionGroups) {
      for (const m of grp.members) {
        map[m] = { id: grp.id, color: grp.color };
      }
      map[grp.id] = { id: grp.id, color: grp.color };
    }
    return map;
  }, [partitionGroups]);

  const nodes: NodePosition[] = useMemo(() => {
    const states = dfa.states;
    const count = states.length;
    const unreachableSet = new Set(unreachableStates);
    const removedSet = new Set(removedStates);
    const visitedSet = new Set(visitedStates);
    const finalSet = new Set(dfa.finalStates);

    const isDefaultFive =
      !isMinimizedGraph &&
      count === 5 &&
      states[0] === 'q0' &&
      states[1] === 'q1' &&
      states[2] === 'q2' &&
      states[3] === 'q3' &&
      states[4] === 'q4';

    return states.map((s, idx) => {
      let x = width / 2;
      let y = height / 2;

      if (customPositions[s]) {
        x = customPositions[s].x;
        y = customPositions[s].y;
      } else if (isDefaultFive) {
        const scaleX = width / 680;
        const scaleY = height / 350;
        const presetCoords: Record<string, { x: number; y: number }> = {
          q0: { x: 130 * scaleX, y: 165 * scaleY },
          q1: { x: 300 * scaleX, y: 95 * scaleY },
          q2: { x: 300 * scaleX, y: 245 * scaleY },
          q3: { x: 475 * scaleX, y: 165 * scaleY },
          q4: { x: 590 * scaleX, y: 265 * scaleY },
        };
        x = presetCoords[s]?.x ?? 200;
        y = presetCoords[s]?.y ?? 175;
      } else if (isMinimizedGraph && count <= 4) {
        const spacing = Math.min(165, (width - 170) / Math.max(1, count - 1));
        const startX = (width - spacing * (count - 1)) / 2;
        x = count === 1 ? width / 2 : startX + idx * spacing;
        y =
          count === 3
            ? idx === 1
              ? height / 2 - 38
              : height / 2 + 22
            : idx % 2 === 0
            ? height / 2 - 16
            : height / 2 + 20;
      } else {
        const isUnreach = unreachableSet.has(s);
        if (isUnreach) {
          const unreachIdx = unreachableStates.indexOf(s);
          x = width - 85;
          y = height - 70 - unreachIdx * 75;
        } else {
          const reachCount = Math.max(
            1,
            states.length - unreachableStates.length
          );
          const reachIdx = states
            .filter((st) => !unreachableSet.has(st))
            .indexOf(s);
          if (reachIdx === 0) {
            x = 115;
            y = height / 2;
          } else {
            const angle =
              -Math.PI / 2 + ((2 * Math.PI) / reachCount) * reachIdx;
            x = width / 2 + Math.cos(angle) * (width * 0.25);
            y = height / 2 + Math.sin(angle) * (height * 0.3);
          }
        }
      }

      const grpInfo = stateToGroupMap[s];
      const minDfaTyped = isMinimizedGraph ? (dfa as MinimizedDFA) : null;
      const membersList = minDfaTyped?.stateGroups?.[s];

      return {
        id: s,
        x,
        y,
        isInitial: dfa.initialState === s,
        isFinal: finalSet.has(s),
        isUnreachable: unreachableSet.has(s),
        isRemoved: removedSet.has(s),
        isVisited: visitedSet.has(s),
        groupId: grpInfo?.id,
        groupColor: grpInfo?.color,
        membersLabel: membersList ? `{${membersList.join(',')}}` : undefined,
      };
    });
  }, [
    dfa,
    width,
    height,
    isMinimizedGraph,
    unreachableStates,
    removedStates,
    visitedStates,
    stateToGroupMap,
    customPositions,
  ]);

  const nodeMap = useMemo(() => {
    const map: Record<string, NodePosition> = {};
    for (const n of nodes) {
      map[n.id] = n;
    }
    return map;
  }, [nodes]);

  const edges: GroupedEdge[] = useMemo(() => {
    const pairMap = new Map<
      string,
      { from: string; to: string; symbols: string[] }
    >();
    const unreachableSet = new Set(unreachableStates);
    const removedSet = new Set(removedStates);

    for (const fromState of dfa.states) {
      if (removedSet.has(fromState)) continue;
      const row = dfa.transitions[fromState];
      if (!row) continue;

      for (const sym of dfa.alphabet) {
        const toState = row[sym];
        if (!toState || !nodeMap[toState] || removedSet.has(toState)) continue;
        const key = `${fromState}->${toState}`;
        if (!pairMap.has(key)) {
          pairMap.set(key, { from: fromState, to: toState, symbols: [] });
        }
        pairMap.get(key)!.symbols.push(sym);
      }
    }

    const result: GroupedEdge[] = [];
    for (const [key, item] of pairMap.entries()) {
      const reverseKey = `${item.to}->${item.from}`;
      const hasReverseEdge = item.from !== item.to && pairMap.has(reverseKey);
      result.push({
        id: key,
        from: item.from,
        to: item.to,
        symbols: item.symbols,
        isSelfLoop: item.from === item.to,
        hasReverseEdge,
        isUnreachable:
          unreachableSet.has(item.from) || unreachableSet.has(item.to),
      });
    }
    return result;
  }, [dfa, nodeMap, unreachableStates, removedStates]);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNode) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const newX = Math.max(
      45,
      Math.min(width - 45, (e.clientX - rect.left) * scaleX)
    );
    const newY = Math.max(
      45,
      Math.min(height - 45, (e.clientY - rect.top) * scaleY)
    );
    setCustomPositions((prev) => ({
      ...prev,
      [draggingNode]: { x: newX, y: newY },
    }));
  };

  const handleSvgMouseUp = () => {
    if (draggingNode) {
      setDraggingNode(null);
    }
  };

  const hoveredNodeData = hoveredState ? nodeMap[hoveredState] : null;
  const particleDuration = Math.max(0.4, 1.1 / speedMultiplier);
  const suffix = isMinimizedGraph ? 'min' : 'orig';

  // String Trace Color Palette:
  // Accepted String Path -> Deep Royal Blue (#1E3A8A fill, #3B82F6 stroke, #DBEAFE text) with Emerald Final Target (#10B981)
  // Rejected String Path -> Deep Rose/Slate (#FB7185)
  const stringPathColor = stringTrace?.isAccepted ? '#3B82F6' : '#F43F5E';

  return (
    <div className="relative w-full bg-[#070E1E] rounded-xl border border-slate-800 overflow-hidden select-none flex flex-col">
      {/* Header Bar + Color Legend */}
      {title && (
        <div className="px-3.5 py-2 bg-[#0B1428] border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isMinimizedGraph ? 'bg-[#22C55E]' : 'bg-[#8B5CF6]'
              }`}
            />
            <span className="text-xs font-semibold text-white">{title}</span>
            {subtitle && (
              <span className="text-[11px] font-mono text-slate-400">
                {subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-300">
            {stringTrace && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#172554] border border-[#3B82F6]/60 text-[#DBEAFE]">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span>
                  {stringTrace.isAccepted
                    ? 'Accepted String Path'
                    : 'Rejected String Path'}
                </span>
              </span>
            )}
            {Object.keys(customPositions).length > 0 && (
              <button
                type="button"
                onClick={() => setCustomPositions({})}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Reset layout
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredNodeData && !hoveredNodeData.isRemoved && (
        <div className="absolute bottom-2.5 left-3 z-20 px-2.5 py-1 rounded bg-[#0B1428]/95 border border-slate-700 text-[11px] font-mono text-slate-300 pointer-events-none flex items-center gap-3">
          <span className="font-bold text-white">{hoveredNodeData.id}</span>
          {hoveredNodeData.membersLabel && (
            <span className="text-[#06B6D4]">{hoveredNodeData.membersLabel}</span>
          )}
          <span>Final: {hoveredNodeData.isFinal ? 'Yes' : 'No'}</span>
          {!isMinimizedGraph && (
            <span>
              Reachable: {hoveredNodeData.isUnreachable ? 'No' : 'Yes'}
            </span>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full ${compact ? 'h-[285px]' : 'h-[330px]'}`}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
        onClick={() => {
          onSelectState?.(null);
          onSelectEdge?.(null);
        }}
      >
        <defs>
          <marker
            id={`arrow-normal-${suffix}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#6366F1" />
          </marker>

          <marker
            id={`arrow-active-${suffix}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#06B6D4" />
          </marker>

          {/* Distinct Blue Arrowhead for String Trace Path */}
          <marker
            id={`arrow-string-accept-${suffix}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#3B82F6" />
          </marker>

          <marker
            id={`arrow-string-reject-${suffix}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#F43F5E" />
          </marker>

          <marker
            id={`arrow-unreach-${suffix}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#F43F5E" />
          </marker>

          <marker
            id={`arrow-start-${suffix}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#22C55E" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const fromNode = nodeMap[edge.from];
          const toNode = nodeMap[edge.to];
          if (!fromNode || !toNode) return null;

          // Check if this edge is part of the user's input string trace
          const isStringActiveEdge =
            stringTrace?.activeEdge &&
            stringTrace.activeEdge.from === edge.from &&
            stringTrace.activeEdge.to === edge.to;

          const isStringTraversedEdge =
            stringTrace?.traversedEdges.some(
              (te) => te.from === edge.from && te.to === edge.to
            ) ?? false;

          const isAlgorithmEdgeActive =
            !stringTrace &&
            ((activeEdge &&
              activeEdge.from === edge.from &&
              activeEdge.to === edge.to) ||
              (selectedEdge &&
                selectedEdge.from === edge.from &&
                selectedEdge.to === edge.to));

          let pathD = '';
          let labelX = 0;
          let labelY = 0;

          if (edge.isSelfLoop) {
            const sx = fromNode.x - 11;
            const sy = fromNode.y - nodeRadius + 2;
            const ex = fromNode.x + 11;
            const ey = fromNode.y - nodeRadius + 2;
            const c1x = fromNode.x - 30;
            const c1y = fromNode.y - nodeRadius - 42;
            const c2x = fromNode.x + 30;
            const c2y = fromNode.y - nodeRadius - 42;
            pathD = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
            labelX = fromNode.x;
            labelY = fromNode.y - nodeRadius - 36;
          } else {
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const ux = dx / dist;
            const uy = dy / dist;
            const nx = -uy;
            const ny = ux;
            const curveOffset = edge.hasReverseEdge ? 26 : 0;

            const sx =
              fromNode.x + ux * nodeRadius + nx * (edge.hasReverseEdge ? 6 : 0);
            const sy =
              fromNode.y + uy * nodeRadius + ny * (edge.hasReverseEdge ? 6 : 0);
            const ex =
              toNode.x -
              ux * (nodeRadius + 4) +
              nx * (edge.hasReverseEdge ? 6 : 0);
            const ey =
              toNode.y -
              uy * (nodeRadius + 4) +
              ny * (edge.hasReverseEdge ? 6 : 0);

            const ctrlX = (fromNode.x + toNode.x) / 2 + nx * curveOffset;
            const ctrlY = (fromNode.y + toNode.y) / 2 + ny * curveOffset;

            pathD = `M ${sx} ${sy} Q ${ctrlX} ${ctrlY} ${ex} ${ey}`;
            labelX = (fromNode.x + toNode.x) / 2 + nx * (curveOffset * 0.65);
            labelY =
              (fromNode.y + toNode.y) / 2 +
              ny * (curveOffset * 0.65) -
              (curveOffset === 0 ? 10 : 0);
          }

          let strokeColor = '#4F46E5';
          let markerEnd = `url(#arrow-normal-${suffix})`;
          let strokeWidth = 1.75;

          if (isStringActiveEdge || isStringTraversedEdge) {
            strokeColor = stringPathColor;
            markerEnd = stringTrace?.isAccepted
              ? `url(#arrow-string-accept-${suffix})`
              : `url(#arrow-string-reject-${suffix})`;
            strokeWidth = isStringActiveEdge ? 3.2 : 2.5;
          } else if (isAlgorithmEdgeActive) {
            strokeColor = '#06B6D4';
            markerEnd = `url(#arrow-active-${suffix})`;
            strokeWidth = 2.6;
          } else if (edge.isUnreachable) {
            strokeColor = '#F43F5E';
            markerEnd = `url(#arrow-unreach-${suffix})`;
          }

          const labelText = edge.symbols.join(',');

          return (
            <g
              key={edge.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEdge?.({ from: edge.from, to: edge.to });
              }}
            >
              <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} />
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={edge.isUnreachable ? '4,4' : undefined}
                markerEnd={markerEnd}
                opacity={
                  stringTrace && !isStringTraversedEdge && !isStringActiveEdge
                    ? 0.35
                    : 1
                }
              />

              {/* Moving Particle along Active String Edge (Gold/Amber) or Algorithm Edge (Cyan) */}
              {(isStringActiveEdge || isAlgorithmEdgeActive) && (
                <motion.circle
                  r={5.5}
                  fill={isStringActiveEdge ? stringPathColor : '#06B6D4'}
                  initial={{ offsetDistance: '0%' }}
                  animate={{ offsetDistance: '100%' }}
                  transition={{
                    duration: particleDuration,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{ offsetPath: `path('${pathD}')` }}
                />
              )}

              <rect
                x={labelX - (labelText.length * 3.5 + 7)}
                y={labelY - 9}
                width={labelText.length * 7 + 14}
                height={18}
                rx={4}
                fill={
                  isStringActiveEdge || isStringTraversedEdge
                    ? '#172554'
                    : '#0B1428'
                }
                stroke={
                  isStringActiveEdge || isStringTraversedEdge
                    ? stringPathColor
                    : isAlgorithmEdgeActive
                    ? '#06B6D4'
                    : edge.isUnreachable
                    ? '#F43F5E'
                    : '#475569'
                }
                strokeWidth={
                  isStringActiveEdge || isStringTraversedEdge ? 1.5 : 1
                }
              />
              <text
                x={labelX}
                y={labelY + 3.5}
                textAnchor="middle"
                className={`font-mono text-[11px] font-bold ${
                  isStringActiveEdge || isStringTraversedEdge
                    ? 'fill-[#DBEAFE]'
                    : 'fill-slate-100'
                }`}
              >
                {labelText}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          if (node.isRemoved) return null;

          const isStringCurrent = stringTrace?.currentState === node.id;
          const isStringVisited =
            stringTrace?.visitedStates.includes(node.id) ?? false;

          const isHighlighted =
            !stringTrace &&
            (activeState === node.id ||
              selectedState === node.id ||
              highlightedStates.includes(node.id) ||
              (activeEdge &&
                (activeEdge.from === node.id || activeEdge.to === node.id)));

          let strokeColor = node.groupColor || '#8B5CF6';
          let fillColor = '#0F1930';
          let strokeWidth = 2;

          if (node.isUnreachable) {
            strokeColor = '#F43F5E';
            fillColor = '#1F0916';
          } else if (isStringCurrent) {
            // Distinct dark blue / emerald for current/final state of string trace
            if (stringTrace?.isAccepted && node.isFinal) {
              strokeColor = '#10B981'; // Bright Emerald for Accepted Final State
              fillColor = '#064E3B';
            } else if (!stringTrace?.isAccepted) {
              strokeColor = '#F43F5E'; // Rose for Rejected State
              fillColor = '#310B19';
            } else {
              strokeColor = '#3B82F6'; // Royal Blue for active step in string
              fillColor = '#1E3A8A';
            }
            strokeWidth = 3.2;
          } else if (isStringVisited) {
            // Visited along the string path: Dark Blue fill with Blue border
            strokeColor = stringPathColor;
            fillColor = '#172554';
            strokeWidth = 2.6;
          } else if (isHighlighted) {
            strokeColor = '#06B6D4';
            fillColor = '#082F49';
            strokeWidth = 2.6;
          } else if (node.isFinal) {
            strokeColor = '#22C55E';
            fillColor = '#07221B';
          }

          return (
            <g
              key={node.id}
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingNode(node.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectState?.(node.id === selectedState ? null : node.id);
              }}
              onMouseEnter={() => setHoveredState(node.id)}
              onMouseLeave={() => setHoveredState(null)}
            >
              {/* Start arrow */}
              {node.isInitial && (
                <g>
                  <line
                    x1={node.x - nodeRadius - 36}
                    y1={node.y}
                    x2={node.x - nodeRadius - 4}
                    y2={node.y}
                    stroke="#22C55E"
                    strokeWidth={2}
                    markerEnd={`url(#arrow-start-${suffix})`}
                  />
                  <text
                    x={node.x - nodeRadius - 42}
                    y={node.y + 3.5}
                    textAnchor="end"
                    className="font-mono text-[10px] font-semibold fill-[#22C55E]"
                  >
                    start
                  </text>
                </g>
              )}

              {/* Outer Halo Ring when this state is the active String Trace node */}
              {isStringCurrent && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius + 5}
                  fill="none"
                  stroke={
                    stringTrace?.isAccepted && node.isFinal
                      ? '#10B981'
                      : stringPathColor
                  }
                  strokeWidth={1.5}
                  strokeDasharray="3,3"
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={node.isUnreachable ? '4,3' : undefined}
              />

              {/* Double circle for final state */}
              {node.isFinal && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius - 4.5}
                  fill="none"
                  stroke={isStringCurrent ? '#A7F3D0' : '#22C55E'}
                  strokeWidth={1.6}
                />
              )}

              {/* State Name */}
              <text
                x={node.x}
                y={node.membersLabel ? node.y - 2 : node.y + 4.5}
                textAnchor="middle"
                className={`font-mono text-xs font-bold pointer-events-none ${
                  isStringCurrent || isStringVisited
                    ? 'fill-[#DBEAFE]'
                    : 'fill-white'
                }`}
              >
                {node.id}
              </text>

              {/* Equivalence set label for minimized DFA state e.g. {q0,q1} */}
              {node.membersLabel && (
                <text
                  x={node.x}
                  y={node.y + 10}
                  textAnchor="middle"
                  className="font-mono text-[9px] fill-slate-200 pointer-events-none"
                >
                  {node.membersLabel}
                </text>
              )}

              {/* Unreachable tag */}
              {node.isUnreachable && (
                <text
                  x={node.x}
                  y={node.y + nodeRadius + 14}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-[#FDA4AF]"
                >
                  unreachable
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
