/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  CheckSquare,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  FileOutput,
  FileText,
  GitBranch,
  List,
  PencilLine,
  Play,
  Plus,
  SlidersHorizontal,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Square,
  Undo2,
  Redo2,
} from 'lucide-react';
import { type Prompt, type Skill, type Workflow, type WorkflowNode, type WorkflowRun } from '../types/agent-extension';
import { UIButton, UIInput, UIPanel, UISectionKicker, UIBadge, UITextarea, UIPageShell, UIPageHeader, UIPageBody, UICardGrid, UIListCard, UIOverlayPage } from './ui';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    require?: any;
  }
}

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

type NodeKind = WorkflowNode['type'];

const NODE_LIBRARY: Array<{
  type: NodeKind;
  label: string;
  category: string;
  description: string;
  defaultConfig: Record<string, unknown>;
}> = [
  { type: 'llm', label: '大模型', category: 'AI 能力', description: '调用当前 API 设置里的推理模型。', defaultConfig: { prompt: '请根据 {{query}} 生成一份结构化输出。' } },
  { type: 'knowledge', label: '知识库', category: 'AI 能力', description: '先从知识库检索上下文，再交给后续节点。', defaultConfig: { query: '{{query}}', topK: 5 } },
  { type: 'prompt', label: 'Prompt 模板', category: 'AI 能力', description: '复用 Prompt 助手里的模板，或者写内联模板。', defaultConfig: { content: '请基于 {{query}} 输出结果。' } },
  { type: 'skill', label: 'Skill', category: '工具能力', description: '把 Skill 的说明和边界注入流程。', defaultConfig: {} },
  { type: 'condition', label: '条件判断', category: '逻辑控制', description: '根据条件决定 true/false 分支走向。', defaultConfig: { condition: 'Boolean(input)', trueNodeId: '', falseNodeId: '' } },
  { type: 'parallel', label: '结果聚合', category: '逻辑控制', description: '聚合多个节点的输出结果。', defaultConfig: { mode: 'collect', sourceNodeIds: [] } },
  { type: 'document', label: '文档输出', category: '输出', description: '把内容写入本地 Markdown / 文本文件。', defaultConfig: { outputPath: '', contentTemplate: '{{result.llm}}' } },
];

const START_NODE_ID = 'start';
const END_NODE_ID = 'end';
const CANVAS_WIDTH = 4200;
const CANVAS_HEIGHT = 2200;
const NODE_WIDTH = 224;
const NODE_HEIGHT = 112;
const SNAP_THRESHOLD = 12;
const INPUT_PORT_HIT_RADIUS = 44;
const NODE_COLUMN_GAP = 320;
const NODE_ROW_GAP = 176;
const CANVAS_MARGIN_X = 140;
const CANVAS_MARGIN_Y = 120;

const nodeIcon = (type: NodeKind) => {
  if (type === 'llm') return <BrainCircuit size={15} className="text-violet-300" />;
  if (type === 'knowledge') return <Database size={15} className="text-emerald-300" />;
  if (type === 'prompt') return <FileText size={15} className="text-sky-300" />;
  if (type === 'skill') return <Wrench size={15} className="text-cyan-300" />;
  if (type === 'condition') return <GitBranch size={15} className="text-amber-300" />;
  if (type === 'parallel') return <Sparkles size={15} className="text-pink-300" />;
  if (type === 'document') return <FileOutput size={15} className="text-orange-300" />;
  return <Bot size={15} className="text-white/70" />;
};

const createCanvasNode = (type: NodeKind, index: number, baseX = 260): WorkflowNode => ({
  id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  label: NODE_LIBRARY.find(item => item.type === type)?.label || type,
  config: { ...(NODE_LIBRARY.find(item => item.type === type)?.defaultConfig || {}) },
  position: { x: baseX + index * 260, y: 160 },
});

const getStructuredNodePosition = (index: number) => ({
  x: CANVAS_MARGIN_X + (index % 3) * NODE_COLUMN_GAP,
  y: CANVAS_MARGIN_Y + Math.floor(index / 3) * NODE_ROW_GAP,
});

const buildEdges = (nodes: WorkflowNode[]) => {
  const bodyNodes = nodes.filter(node => node.id !== START_NODE_ID && node.id !== END_NODE_ID);
  const edges = new Map<string, { id: string; source: string; target: string; sourceHandle?: string }>();
  const conditionBranchTargets = new Map<string, Set<string>>();

  const addEdge = (source: string | undefined, target: string, sourceHandle?: string) => {
    if (!source || source === target) return;
    const edgeId = sourceHandle ? `${source}_${sourceHandle}_${target}` : `${source}_${target}`;
    const dedupeKey = sourceHandle ? `${source}_${sourceHandle}_${target}` : `${source}_${target}`;
    edges.set(dedupeKey, { id: edgeId, source, target, sourceHandle });
  };

  bodyNodes.forEach(node => {
    if (node.type !== 'condition') return;
    const trueTarget = typeof node.config.trueNodeId === 'string' ? String(node.config.trueNodeId) : '';
    const falseTarget = typeof node.config.falseNodeId === 'string' ? String(node.config.falseNodeId) : '';
    const set = conditionBranchTargets.get(node.id) || new Set<string>();
    if (trueTarget) set.add(trueTarget);
    if (falseTarget) set.add(falseTarget);
    if (set.size > 0) conditionBranchTargets.set(node.id, set);
  });

  bodyNodes.forEach(node => {
    if (node.type === 'parallel') {
      const sourceNodeIds = Array.isArray(node.config.sourceNodeIds) ? (node.config.sourceNodeIds as string[]) : [];
      if (sourceNodeIds.length > 0) {
        sourceNodeIds.forEach(sourceId => addEdge(sourceId, node.id));
        return;
      }
    }

    const explicitSource = typeof node.config.inputNode === 'string' && node.config.inputNode
      ? String(node.config.inputNode)
      : undefined;

    if (explicitSource) {
      const hasConditionBranch = conditionBranchTargets.get(explicitSource)?.has(node.id);
      if (!hasConditionBranch) {
        addEdge(explicitSource, node.id);
      }
    }
  });

  bodyNodes.forEach(node => {
    if (node.type !== 'condition') return;
    const trueTarget = typeof node.config.trueNodeId === 'string' ? String(node.config.trueNodeId) : '';
    const falseTarget = typeof node.config.falseNodeId === 'string' ? String(node.config.falseNodeId) : '';
    if (trueTarget) addEdge(node.id, trueTarget, 'true');
    if (falseTarget) addEdge(node.id, falseTarget, 'false');
  });

  const endNode = nodes.find(node => node.id === END_NODE_ID);
  if (endNode) {
    const endSourceIds = Array.isArray(endNode.config.sourceNodeIds)
      ? (endNode.config.sourceNodeIds as string[]).filter(Boolean)
      : [];
    if (endSourceIds.length > 0) {
      endSourceIds.forEach(sourceId => addEdge(sourceId, endNode.id));
    } else {
      const endSource = typeof endNode.config.inputNode === 'string' && endNode.config.inputNode
        ? String(endNode.config.inputNode)
        : '';
      if (endSource) addEdge(endSource, endNode.id);
    }
  }

  return Array.from(edges.values());
};

const edgePath = (from: WorkflowNode, to: WorkflowNode) => {
  const startX = (from.position?.x || 0) + NODE_WIDTH;
  const startY = (from.position?.y || 0) + 52;
  const endX = (to.position?.x || 0);
  const endY = (to.position?.y || 0) + 52;
  const controlX = startX + (endX - startX) / 2;
  return `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
};

const isConditionHandle = (value: string | undefined): value is 'true' | 'false' => value === 'true' || value === 'false';

const cloneWorkflowSnapshot = (workflow: Workflow): Workflow => JSON.parse(JSON.stringify(workflow)) as Workflow;
const sameWorkflowSnapshot = (a: Workflow, b: Workflow) => JSON.stringify(a) === JSON.stringify(b);

const autoLayoutWorkflowNodes = (nodes: WorkflowNode[]): WorkflowNode[] => {
  const edges = buildEdges(nodes);
  const adjacency = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  const depth = new Map<string, number>();
  const yIndexByDepth = new Map<number, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    incomingCount.set(node.id, 0);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const node of nodes) {
    if ((incomingCount.get(node.id) || 0) === 0) {
      queue.push(node.id);
      depth.set(node.id, node.id === START_NODE_ID ? 0 : 1);
    }
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = depth.get(currentId) || 0;
    for (const targetId of adjacency.get(currentId) || []) {
      depth.set(targetId, Math.max(depth.get(targetId) || 0, currentDepth + 1));
      const nextIn = (incomingCount.get(targetId) || 0) - 1;
      incomingCount.set(targetId, nextIn);
      if (nextIn === 0) queue.push(targetId);
    }
  }

  return nodes.map(node => {
    if (node.id === START_NODE_ID) {
      return { ...node, position: { x: CANVAS_MARGIN_X, y: CANVAS_MARGIN_Y + NODE_ROW_GAP } };
    }
    if (node.id === END_NODE_ID) {
      const endDepth = Math.max(...Array.from(depth.values()), 2);
      return {
        ...node,
        position: {
          x: CANVAS_MARGIN_X + endDepth * NODE_COLUMN_GAP,
          y: CANVAS_MARGIN_Y + NODE_ROW_GAP,
        },
      };
    }

    const nodeDepth = Math.max(1, depth.get(node.id) || 1);
    const rowIndex = yIndexByDepth.get(nodeDepth) || 0;
    yIndexByDepth.set(nodeDepth, rowIndex + 1);
    return {
      ...node,
      position: {
        x: CANVAS_MARGIN_X + nodeDepth * NODE_COLUMN_GAP,
        y: CANVAS_MARGIN_Y + rowIndex * NODE_ROW_GAP,
      },
    };
  }).map((node, index) => {
    if (node.position) return node;
    return { ...node, position: getStructuredNodePosition(index) };
  });
};

const noDragRegionStyle: CSSProperties & { WebkitAppRegion: 'no-drag' } = {
  WebkitAppRegion: 'no-drag',
};

export function WorkflowPanel({
  onClose,
}: {
  onInsertToInput: (value: string) => void;
  onClose?: () => void;
}) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedWorkflowCardIds, setSelectedWorkflowCardIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [nodePanelQuery, setNodePanelQuery] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [showNodeList, setShowNodeList] = useState(true);
  const [showNodeConfig, setShowNodeConfig] = useState(true);
  const [temporaryWorkflowIds, setTemporaryWorkflowIds] = useState<string[]>([]);
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, Workflow>>({});
  const [historyMeta, setHistoryMeta] = useState<Record<string, { pastCount: number; futureCount: number }>>({});
  const [bodyInteraction, setBodyInteraction] = useState<{ cursor: '' | 'grabbing' | 'crosshair'; lockSelection: boolean }>({
    cursor: '',
    lockSelection: false,
  });
  const [runInput] = useState('{"query": ""}');
  const [linkingFrom, setLinkingFrom] = useState<{ nodeId: string; sourceHandle?: string } | null>(null);
  const [draftLink, setDraftLink] = useState<{ sourceNodeId: string; sourceHandle?: string; x: number; y: number } | null>(null);
  const [reconnectingEdge, setReconnectingEdge] = useState<{ sourceNodeId: string; sourceHandle?: string; oldTargetNodeId: string } | null>(null);
  const [edgeInsertMenu, setEdgeInsertMenu] = useState<{ source: string; target: string; sourceHandle?: string; x: number; y: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const dragState = useRef<
    | { mode: 'single'; nodeId: string; offsetX: number; offsetY: number }
    | { mode: 'group'; nodeIds: string[]; anchorX: number; anchorY: number; original: Record<string, { x: number; y: number }> }
    | null
  >(null);
  const dragStartSnapshotRef = useRef<Workflow | null>(null);
  const panState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const selectionState = useRef<{ startX: number; startY: number } | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasViewport, setCanvasViewport] = useState({ x: 120, y: 72, zoom: 1 });
  const canvasViewportRef = useRef(canvasViewport);
  const workflowsRef = useRef<Workflow[]>([]);
  const draftLinkRef = useRef(draftLink);
  const reconnectingEdgeRef = useRef(reconnectingEdge);
  const selectedNodeIdsRef = useRef<string[]>([]);
  const isSpacePressedRef = useRef(false);
  const historyRef = useRef<Record<string, { past: Workflow[]; future: Workflow[] }>>({});
  const savedSnapshotsRef = useRef<Record<string, Workflow>>({});
  const temporaryWorkflowIdsRef = useRef<string[]>([]);
  const connectNodesRef = useRef<(sourceNodeId: string, targetNodeId: string, sourceHandle?: string) => void>(() => undefined);

  useEffect(() => {
    canvasViewportRef.current = canvasViewport;
  }, [canvasViewport]);

  useEffect(() => {
    workflowsRef.current = workflows;
  }, [workflows]);

  useEffect(() => {
    draftLinkRef.current = draftLink;
  }, [draftLink]);

  useEffect(() => {
    reconnectingEdgeRef.current = reconnectingEdge;
  }, [reconnectingEdge]);

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  useEffect(() => {
    temporaryWorkflowIdsRef.current = temporaryWorkflowIds;
  }, [temporaryWorkflowIds]);

  useEffect(() => {
    document.body.style.userSelect = bodyInteraction.lockSelection ? 'none' : '';
    document.body.style.cursor = bodyInteraction.cursor;
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [bodyInteraction]);

  const clampZoom = useCallback((zoom: number) => Math.max(0.55, Math.min(1.8, zoom)), []);

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    const viewport = canvasViewportRef.current;
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }, []);

  const resolveNearestInputNodeId = useCallback((
    clientX: number,
    clientY: number,
    sourceNodeId?: string,
  ): string | null => {
    const point = toCanvasPoint(clientX, clientY);
    const currentWorkflow = selectedWorkflowId
      ? workflowsRef.current.find(workflow => workflow.id === selectedWorkflowId) || null
      : null;
    if (!currentWorkflow) return null;

    let nearest: { id: string; distance: number } | null = null;
    for (const node of currentWorkflow.nodes) {
      if (node.id === START_NODE_ID) continue;
      if (sourceNodeId && node.id === sourceNodeId) continue;
      const portX = node.position?.x || 0;
      const portY = (node.position?.y || 0) + NODE_HEIGHT / 2;
      const dx = point.x - portX;
      const dy = point.y - portY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > INPUT_PORT_HIT_RADIUS) continue;
      if (!nearest || distance < nearest.distance) {
        nearest = { id: node.id, distance };
      }
    }
    return nearest?.id || null;
  }, [selectedWorkflowId, toCanvasPoint]);

  const loadData = useCallback(async () => {
    if (!ipcRenderer) return;
    const [workflowData, runData, promptData, skillData] = await Promise.all([
      ipcRenderer.invoke('workflow:list'),
      ipcRenderer.invoke('workflow:runs'),
      ipcRenderer.invoke('prompt:list'),
      ipcRenderer.invoke('skill:list'),
    ]);

    const persistedWorkflows = (workflowData || []) as Workflow[];
    const nextSavedSnapshots = Object.fromEntries(
      persistedWorkflows.map(workflow => [workflow.id, cloneWorkflowSnapshot(workflow)]),
    );
    savedSnapshotsRef.current = nextSavedSnapshots;
    setSavedSnapshots(nextSavedSnapshots);
    const temporaryIds = new Set(temporaryWorkflowIdsRef.current);
    const temporaryWorkflows = workflowsRef.current.filter(workflow => temporaryIds.has(workflow.id));
    const mergedWorkflows = [...temporaryWorkflows, ...persistedWorkflows];

    setWorkflows(mergedWorkflows);
    setRuns(runData || []);
    setPrompts(promptData || []);
    setSkills(skillData || []);
    setSelectedWorkflowCardIds(prev => prev.filter(id => mergedWorkflows.some(workflow => workflow.id === id)));

    if (!selectedWorkflowId && mergedWorkflows.length) {
      setSelectedWorkflowId(mergedWorkflows[0].id);
    } else if (selectedWorkflowId && !mergedWorkflows.some(workflow => workflow.id === selectedWorkflowId)) {
      setSelectedWorkflowId(mergedWorkflows[0]?.id || null);
    }
    return mergedWorkflows;
  }, [selectedWorkflowId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (showEditor) {
      setCanvasViewport({ x: 120, y: 72, zoom: 1 });
      setShowNodeList(true);
      setShowNodeConfig(true);
    }
  }, [selectedWorkflowId, showEditor]);

  useEffect(() => {
    setLinkingFrom(null);
    setDraftLink(null);
    setReconnectingEdge(null);
    setEdgeInsertMenu(null);
    setSelectedEdgeId(null);
    setSelectionBox(null);
    setAlignmentGuides({ x: null, y: null });
    dragStartSnapshotRef.current = null;
    selectionState.current = null;
    setSelectedNodeIds([]);
  }, [selectedWorkflowId, showEditor]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') isSpacePressedRef.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') isSpacePressedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const pushHistoryEntry = useCallback((workflowId: string, beforeSnapshot: Workflow) => {
    const history = historyRef.current[workflowId] || { past: [], future: [] };
    const snapshot = cloneWorkflowSnapshot(beforeSnapshot);
    const last = history.past.at(-1);
    if (last && sameWorkflowSnapshot(last, snapshot)) return;
    history.past.push(snapshot);
    if (history.past.length > 80) {
      history.past = history.past.slice(history.past.length - 80);
    }
    history.future = [];
    historyRef.current[workflowId] = history;
    setHistoryMeta(prev => ({
      ...prev,
      [workflowId]: { pastCount: history.past.length, futureCount: history.future.length },
    }));
  }, []);

  useEffect(() => {
    const runFrame = () => {
      dragRafRef.current = null;
      const pointer = dragPointerRef.current;
      if (!pointer || !showEditor) return;

      const dragging = dragState.current;
      if (dragging && selectedWorkflowId) {
        const point = toCanvasPoint(pointer.x, pointer.y);
        setWorkflows(prev => prev.map(workflow => {
          if (workflow.id !== selectedWorkflowId) return workflow;
          if (dragging.mode === 'single') {
            const rawX = Math.max(24, Math.min(CANVAS_WIDTH - 280, point.x - dragging.offsetX));
            const rawY = Math.max(24, Math.min(CANVAS_HEIGHT - 120, point.y - dragging.offsetY));
            const movingNode = workflow.nodes.find(node => node.id === dragging.nodeId);
            if (!movingNode) return workflow;

            let snappedX = rawX;
            let snappedY = rawY;
            let guideX: number | null = null;
            let guideY: number | null = null;
            let bestXDelta = SNAP_THRESHOLD + 1;
            let bestYDelta = SNAP_THRESHOLD + 1;

            const movingLinesX = [rawX, rawX + NODE_WIDTH / 2, rawX + NODE_WIDTH];
            const movingLinesY = [rawY, rawY + NODE_HEIGHT / 2, rawY + NODE_HEIGHT];

            for (const other of workflow.nodes) {
              if (other.id === dragging.nodeId) continue;
              const otherX = other.position?.x || 0;
              const otherY = other.position?.y || 0;
              const candidateLinesX = [otherX, otherX + NODE_WIDTH / 2, otherX + NODE_WIDTH];
              const candidateLinesY = [otherY, otherY + NODE_HEIGHT / 2, otherY + NODE_HEIGHT];

              for (const movingLineX of movingLinesX) {
                for (const candidateX of candidateLinesX) {
                  const diff = candidateX - movingLineX;
                  const abs = Math.abs(diff);
                  if (abs <= SNAP_THRESHOLD && abs < bestXDelta) {
                    bestXDelta = abs;
                    snappedX = rawX + diff;
                    guideX = candidateX;
                  }
                }
              }

              for (const movingLineY of movingLinesY) {
                for (const candidateY of candidateLinesY) {
                  const diff = candidateY - movingLineY;
                  const abs = Math.abs(diff);
                  if (abs <= SNAP_THRESHOLD && abs < bestYDelta) {
                    bestYDelta = abs;
                    snappedY = rawY + diff;
                    guideY = candidateY;
                  }
                }
              }
            }

            snappedX = Math.max(24, Math.min(CANVAS_WIDTH - 280, snappedX));
            snappedY = Math.max(24, Math.min(CANVAS_HEIGHT - 120, snappedY));
            setAlignmentGuides({ x: guideX, y: guideY });

            return {
              ...workflow,
              nodes: workflow.nodes.map(node => node.id === dragging.nodeId
                ? {
                    ...node,
                    position: {
                      x: snappedX,
                      y: snappedY,
                    },
                  }
                : node),
            };
          }

          setAlignmentGuides({ x: null, y: null });
          const deltaX = point.x - dragging.anchorX;
          const deltaY = point.y - dragging.anchorY;
          return {
            ...workflow,
            nodes: workflow.nodes.map(node => {
              if (!dragging.nodeIds.includes(node.id)) return node;
              const origin = dragging.original[node.id];
              if (!origin) return node;
              return {
                ...node,
                position: {
                  x: Math.max(24, Math.min(CANVAS_WIDTH - 280, origin.x + deltaX)),
                  y: Math.max(24, Math.min(CANVAS_HEIGHT - 120, origin.y + deltaY)),
                },
              };
            }),
          };
        }));
        return;
      }

      const panning = panState.current;
      if (panning) {
        setAlignmentGuides({ x: null, y: null });
        setCanvasViewport(prev => ({
          ...prev,
          x: panning.originX + (pointer.x - panning.startX),
          y: panning.originY + (pointer.y - panning.startY),
        }));
        return;
      }

      const linking = draftLinkRef.current;
      if (linking) {
        setAlignmentGuides({ x: null, y: null });
        const point = toCanvasPoint(pointer.x, pointer.y);
        setDraftLink({
          sourceNodeId: linking.sourceNodeId,
          sourceHandle: linking.sourceHandle,
          x: point.x,
          y: point.y,
        });
        return;
      }

      const selecting = selectionState.current;
      if (selecting) {
        setAlignmentGuides({ x: null, y: null });
        const point = toCanvasPoint(pointer.x, pointer.y);
        setSelectionBox({
          startX: selecting.startX,
          startY: selecting.startY,
          endX: point.x,
          endY: point.y,
        });
      }
    };

    const scheduleFrame = () => {
      if (dragRafRef.current !== null) return;
      dragRafRef.current = window.requestAnimationFrame(runFrame);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current && !panState.current && !draftLinkRef.current && !selectionState.current) return;
      dragPointerRef.current = { x: event.clientX, y: event.clientY };
      scheduleFrame();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const linking = draftLinkRef.current;
      const reconnecting = reconnectingEdgeRef.current;
      const selecting = selectionState.current;
      const wasDragging = Boolean(dragState.current);
      if (linking) {
        const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
        const portEl = target?.closest('[data-node-input-port-for]') as HTMLElement | null;
        const targetNodeId = portEl?.dataset.nodeInputPortFor || resolveNearestInputNodeId(
          event.clientX,
          event.clientY,
          linking.sourceNodeId,
        );
        if (targetNodeId) {
          connectNodesRef.current(linking.sourceNodeId, targetNodeId, linking.sourceHandle);
          setSelectedNodeId(targetNodeId);
          setSelectedNodeIds([targetNodeId]);
        } else if (reconnecting) {
          connectNodesRef.current(reconnecting.sourceNodeId, reconnecting.oldTargetNodeId, reconnecting.sourceHandle);
        }
      }

      const currentWorkflow = selectedWorkflowId
        ? workflowsRef.current.find(workflow => workflow.id === selectedWorkflowId) || null
        : null;
      if (wasDragging && selectedWorkflowId && currentWorkflow && dragStartSnapshotRef.current) {
        if (!sameWorkflowSnapshot(dragStartSnapshotRef.current, currentWorkflow)) {
          pushHistoryEntry(selectedWorkflowId, dragStartSnapshotRef.current);
        }
      }
      if (selecting && currentWorkflow) {
        const point = toCanvasPoint(event.clientX, event.clientY);
        const box = {
          left: Math.min(selecting.startX, point.x),
          right: Math.max(selecting.startX, point.x),
          top: Math.min(selecting.startY, point.y),
          bottom: Math.max(selecting.startY, point.y),
        };
        const nodeIds = currentWorkflow.nodes
          .filter(node => {
            const x = node.position?.x || 0;
            const y = node.position?.y || 0;
            const right = x + NODE_WIDTH;
            const bottom = y + NODE_HEIGHT;
            return right >= box.left && x <= box.right && bottom >= box.top && y <= box.bottom;
          })
          .map(node => node.id);
        setSelectedNodeIds(nodeIds);
        setSelectedNodeId(nodeIds[0] || null);
      }

      dragState.current = null;
      panState.current = null;
      selectionState.current = null;
      dragStartSnapshotRef.current = null;
      dragPointerRef.current = null;
      setDraftLink(null);
      setLinkingFrom(null);
      setReconnectingEdge(null);
      setSelectionBox(null);
      setAlignmentGuides({ x: null, y: null });
      setBodyInteraction({ cursor: '', lockSelection: false });
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [pushHistoryEntry, resolveNearestInputNodeId, selectedWorkflowId, showEditor, toCanvasPoint]);

  const filteredWorkflows = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return workflows.filter(workflow => {
      const categoryMatched = categoryFilter === 'all' || workflow.category === categoryFilter;
      if (!categoryMatched) return false;
      if (!normalized) return true;
      return workflow.name.toLowerCase().includes(normalized) ||
        workflow.description.toLowerCase().includes(normalized) ||
        workflow.tags.some(tag => tag.toLowerCase().includes(normalized));
    });
  }, [categoryFilter, searchQuery, workflows]);

  const categories = useMemo(() => {
    const values = Array.from(new Set(workflows.map(workflow => workflow.category).filter(Boolean)));
    return ['all', ...values];
  }, [workflows]);

  const selectedWorkflow = workflows.find(workflow => workflow.id === selectedWorkflowId) || null;
  const selectedNode = selectedWorkflow?.nodes.find(node => node.id === selectedNodeId) || null;
  const upstreamCandidates = selectedWorkflow?.nodes.filter(node => node.id !== selectedNodeId && node.id !== END_NODE_ID) || [];
  const temporaryWorkflowIdSet = useMemo(() => new Set(temporaryWorkflowIds), [temporaryWorkflowIds]);
  const isSelectedWorkflowTemporary = Boolean(selectedWorkflow && temporaryWorkflowIdSet.has(selectedWorkflow.id));
  const savedSelectedWorkflow = selectedWorkflow ? savedSnapshots[selectedWorkflow.id] : null;
  const isSelectedWorkflowDirty = Boolean(
    selectedWorkflow && (isSelectedWorkflowTemporary || !savedSelectedWorkflow || !sameWorkflowSnapshot(selectedWorkflow, savedSelectedWorkflow)),
  );

  const libraryItems = useMemo(() => {
    const normalized = libraryQuery.trim().toLowerCase();
    return NODE_LIBRARY.filter(item => {
      if (!normalized) return true;
      return item.label.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized);
    });
  }, [libraryQuery]);

  const visibleCanvasNodes = useMemo(() => {
    if (!selectedWorkflow) return [];
    const normalized = nodePanelQuery.trim().toLowerCase();
    if (!normalized) return selectedWorkflow.nodes;
    return selectedWorkflow.nodes.filter(node => (
      node.label.toLowerCase().includes(normalized) ||
      node.type.toLowerCase().includes(normalized)
    ));
  }, [nodePanelQuery, selectedWorkflow]);

  const libraryItemsByCategory = useMemo(() => {
    return libraryItems.reduce<Record<string, typeof NODE_LIBRARY>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [libraryItems]);

  useEffect(() => {
    if (!selectedWorkflow) return;
    setSelectedNodeIds(prev => prev.filter(id => selectedWorkflow.nodes.some(node => node.id === id)));
    if (selectedNodeId && !selectedWorkflow.nodes.some(node => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, selectedWorkflow]);

  const undoWorkflow = useCallback(() => {
    if (!selectedWorkflowId) return;
    const history = historyRef.current[selectedWorkflowId];
    if (!history || history.past.length === 0) return;
    const current = workflowsRef.current.find(workflow => workflow.id === selectedWorkflowId);
    if (!current) return;
    const previous = history.past.pop();
    if (!previous) return;
    history.future.push(cloneWorkflowSnapshot(current));
    historyRef.current[selectedWorkflowId] = history;
    setHistoryMeta(prev => ({
      ...prev,
      [selectedWorkflowId]: { pastCount: history.past.length, futureCount: history.future.length },
    }));
    setWorkflows(prev => prev.map(workflow => workflow.id === selectedWorkflowId ? cloneWorkflowSnapshot(previous) : workflow));
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
  }, [selectedWorkflowId]);

  const redoWorkflow = useCallback(() => {
    if (!selectedWorkflowId) return;
    const history = historyRef.current[selectedWorkflowId];
    if (!history || history.future.length === 0) return;
    const current = workflowsRef.current.find(workflow => workflow.id === selectedWorkflowId);
    if (!current) return;
    const next = history.future.pop();
    if (!next) return;
    history.past.push(cloneWorkflowSnapshot(current));
    historyRef.current[selectedWorkflowId] = history;
    setHistoryMeta(prev => ({
      ...prev,
      [selectedWorkflowId]: { pastCount: history.past.length, futureCount: history.future.length },
    }));
    setWorkflows(prev => prev.map(workflow => workflow.id === selectedWorkflowId ? cloneWorkflowSnapshot(next) : workflow));
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
  }, [selectedWorkflowId]);

  const canUndo = selectedWorkflowId ? (historyMeta[selectedWorkflowId]?.pastCount || 0) > 0 : false;
  const canRedo = selectedWorkflowId ? (historyMeta[selectedWorkflowId]?.futureCount || 0) > 0 : false;

  const parseRunVariables = useCallback(() => {
    let variables: Record<string, unknown> = {};
    try {
      variables = JSON.parse(runInput || '{}');
    } catch {
      variables = { query: runInput };
    }
    return variables;
  }, [runInput]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!showEditor) return;
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(target?.closest('input, textarea, [contenteditable="true"]'));
      if (isTypingTarget) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) {
        redoWorkflow();
      } else {
        undoWorkflow();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redoWorkflow, showEditor, undoWorkflow]);

  const closeEditorShell = useCallback(() => {
    setShowDiscardPrompt(false);
    setShowLibrary(false);
    setLinkingFrom(null);
    setDraftLink(null);
    setReconnectingEdge(null);
    setEdgeInsertMenu(null);
    setSelectedEdgeId(null);
    setSelectionBox(null);
    setBodyInteraction({ cursor: '', lockSelection: false });
    setShowEditor(false);
  }, []);

  const persistWorkflow = useCallback(async (workflow: Workflow) => {
    if (!ipcRenderer) return null;

    const isTemporary = temporaryWorkflowIdsRef.current.includes(workflow.id);
    let persistedId = workflow.id;

    if (isTemporary) {
      const created = await ipcRenderer.invoke('workflow:create', {
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        tags: workflow.tags,
      });
      persistedId = created.id;

      const nextTemporaryIds = temporaryWorkflowIdsRef.current.filter(id => id !== workflow.id);
      temporaryWorkflowIdsRef.current = nextTemporaryIds;
      setTemporaryWorkflowIds(nextTemporaryIds);

      const history = historyRef.current[workflow.id];
      if (history) {
        historyRef.current[persistedId] = history;
        delete historyRef.current[workflow.id];
        setHistoryMeta(prev => {
          const next = { ...prev };
          next[persistedId] = next[workflow.id] || { pastCount: history.past.length, futureCount: history.future.length };
          delete next[workflow.id];
          return next;
        });
      }

      setWorkflows(prev => prev.map(item => (
        item.id === workflow.id
          ? {
              ...item,
              id: persistedId,
            }
          : item
      )));
      setSelectedWorkflowId(prev => prev === workflow.id ? persistedId : prev);
      setSelectedWorkflowCardIds(prev => prev.map(id => id === workflow.id ? persistedId : id));
    }

    await ipcRenderer.invoke('workflow:update', persistedId, {
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      tags: workflow.tags,
      nodes: workflow.nodes,
      edges: buildEdges(workflow.nodes),
    });
    await loadData();
    return persistedId;
  }, [loadData]);

  const saveWorkflow = useCallback(async (workflow: Workflow) => {
    return persistWorkflow(workflow);
  }, [persistWorkflow]);

  const discardWorkflowChanges = useCallback((workflow: Workflow) => {
    const isTemporary = temporaryWorkflowIdsRef.current.includes(workflow.id);
    if (isTemporary) {
      const nextTemporaryIds = temporaryWorkflowIdsRef.current.filter(id => id !== workflow.id);
      temporaryWorkflowIdsRef.current = nextTemporaryIds;
      setTemporaryWorkflowIds(nextTemporaryIds);
      setWorkflows(prev => prev.filter(item => item.id !== workflow.id));
      setSelectedWorkflowCardIds(prev => prev.filter(id => id !== workflow.id));
      delete historyRef.current[workflow.id];
      setHistoryMeta(prev => {
        const next = { ...prev };
        delete next[workflow.id];
        return next;
      });
      if (selectedWorkflowId === workflow.id) {
        const fallback = workflowsRef.current.find(item => item.id !== workflow.id && !nextTemporaryIds.includes(item.id));
        setSelectedWorkflowId(fallback?.id || null);
      }
    } else {
      const snapshot = savedSnapshotsRef.current[workflow.id];
      if (snapshot) {
        setWorkflows(prev => prev.map(item => item.id === workflow.id ? cloneWorkflowSnapshot(snapshot) : item));
      }
      historyRef.current[workflow.id] = { past: [], future: [] };
      setHistoryMeta(prev => ({
        ...prev,
        [workflow.id]: { pastCount: 0, futureCount: 0 },
      }));
    }
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    closeEditorShell();
  }, [closeEditorShell, selectedWorkflowId]);

  const requestCloseEditor = useCallback(() => {
    if (!selectedWorkflow || !isSelectedWorkflowDirty) {
      closeEditorShell();
      return;
    }
    setShowDiscardPrompt(true);
  }, [closeEditorShell, isSelectedWorkflowDirty, selectedWorkflow]);

  const updateSelectedWorkflow = useCallback((
    updater: (workflow: Workflow) => Workflow,
    options?: { recordHistory?: boolean },
  ) => {
    if (!selectedWorkflowId) return;
    const shouldRecordHistory = options?.recordHistory !== false;
    setWorkflows(prev => {
      let changed = false;
      let beforeSnapshot: Workflow | null = null;
      const next = prev.map(workflow => {
        if (workflow.id !== selectedWorkflowId) return workflow;
        const snapshotBefore = cloneWorkflowSnapshot(workflow);
        const updated = updater(workflow);
        if (sameWorkflowSnapshot(snapshotBefore, updated)) {
          return workflow;
        }
        changed = true;
        beforeSnapshot = snapshotBefore;
        return updated;
      });
      if (changed && shouldRecordHistory && beforeSnapshot) {
        pushHistoryEntry(selectedWorkflowId, beforeSnapshot);
      }
      return changed ? next : prev;
    });
  }, [pushHistoryEntry, selectedWorkflowId]);

  const createWorkflow = async () => {
    const tempId = `workflow_temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const firstLlmNode = createCanvasNode('llm', 0);
    const nodes: WorkflowNode[] = [
      { id: START_NODE_ID, type: 'start', label: '开始', config: {}, position: { x: 80, y: 160 } },
      { ...firstLlmNode, config: { ...firstLlmNode.config, inputNode: START_NODE_ID } },
      { id: END_NODE_ID, type: 'end', label: '结束', config: { inputNode: firstLlmNode.id }, position: { x: 860, y: 160 } },
    ];
    const now = new Date().toISOString();
    const draftWorkflow: Workflow = {
      id: tempId,
      name: '未命名工作流',
      description: '使用节点编排 AI、知识库、Prompt 和文档输出。',
      category: 'content',
      tags: ['draft'],
      nodes,
      edges: buildEdges(nodes),
      variables: {},
      enabled: 1,
      created_at: now,
      updated_at: now,
    };

    const nextTemporaryIds = [tempId, ...temporaryWorkflowIdsRef.current];
    temporaryWorkflowIdsRef.current = nextTemporaryIds;
    setTemporaryWorkflowIds(nextTemporaryIds);
    setWorkflows(prev => [draftWorkflow, ...prev]);
    setSelectedWorkflowId(tempId);
    setSelectedNodeId(firstLlmNode.id);
    setSelectedNodeIds([firstLlmNode.id]);
    setShowEditor(true);
  };

  const duplicateWorkflow = async (workflow: Workflow) => {
    const tempId = `workflow_temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const duplicatedNodes = workflow.nodes.map(node => ({
      ...node,
      config: JSON.parse(JSON.stringify(node.config || {})),
      position: node.position ? { ...node.position } : undefined,
    }));
    const now = new Date().toISOString();
    const duplicateDraft: Workflow = {
      ...cloneWorkflowSnapshot(workflow),
      id: tempId,
      name: `${workflow.name} 副本`,
      tags: Array.from(new Set([...(workflow.tags || []), 'draft'])),
      nodes: duplicatedNodes,
      edges: buildEdges(duplicatedNodes),
      created_at: now,
      updated_at: now,
    };
    const nextTemporaryIds = [tempId, ...temporaryWorkflowIdsRef.current];
    temporaryWorkflowIdsRef.current = nextTemporaryIds;
    setTemporaryWorkflowIds(nextTemporaryIds);
    setWorkflows(prev => [duplicateDraft, ...prev]);
    setSelectedWorkflowId(tempId);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  const toggleWorkflowCardSelection = useCallback((workflowId: string) => {
    setSelectedWorkflowCardIds(prev => (
      prev.includes(workflowId)
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    ));
  }, []);

  const selectAllVisibleWorkflows = useCallback(() => {
    setSelectedWorkflowCardIds(filteredWorkflows.map(workflow => workflow.id));
  }, [filteredWorkflows]);

  const clearWorkflowCardSelection = useCallback(() => {
    setSelectedWorkflowCardIds([]);
  }, []);

  const runWorkflowById = useCallback(async (workflowId: string) => {
    const workflow = workflowsRef.current.find(item => item.id === workflowId);
    if (!workflow || !ipcRenderer) return;
    const persistedId = await saveWorkflow(workflow);
    if (!persistedId) return;
    await ipcRenderer.invoke('workflow:execute', persistedId, parseRunVariables());
  }, [parseRunVariables, saveWorkflow]);

  const deleteWorkflowsByIds = useCallback(async (workflowIds: string[]) => {
    if (workflowIds.length === 0) return;
    const workflowIdSet = new Set(workflowIds);
    const workflowNames = workflowsRef.current
      .filter(workflow => workflowIdSet.has(workflow.id))
      .map(workflow => workflow.name)
      .slice(0, 3);
    const suffix = workflowIds.length > 3 ? ` 等 ${workflowIds.length} 个工作流` : '';
    const confirmed = window.confirm(`确认删除 ${workflowNames.join('、')}${suffix}？`);
    if (!confirmed) return;

    const persistedIds = workflowIds.filter(id => !temporaryWorkflowIdsRef.current.includes(id));
    const nextTemporaryIds = temporaryWorkflowIdsRef.current.filter(id => !workflowIdSet.has(id));
    temporaryWorkflowIdsRef.current = nextTemporaryIds;
    setTemporaryWorkflowIds(nextTemporaryIds);

    if (ipcRenderer) {
      await Promise.all(persistedIds.map(id => ipcRenderer.invoke('workflow:delete', id)));
    }

    setWorkflows(prev => prev.filter(workflow => !workflowIdSet.has(workflow.id)));
    setSelectedWorkflowCardIds(prev => prev.filter(id => !workflowIdSet.has(id)));
    if (selectedWorkflowId && workflowIdSet.has(selectedWorkflowId)) {
      setSelectedWorkflowId(null);
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      setShowEditor(false);
    }

    workflowIds.forEach(id => {
      delete historyRef.current[id];
      delete savedSnapshotsRef.current[id];
    });
    setHistoryMeta(prev => {
      const next = { ...prev };
      workflowIds.forEach(id => {
        delete next[id];
      });
      return next;
    });
    setSavedSnapshots(prev => {
      const next = { ...prev };
      workflowIds.forEach(id => {
        delete next[id];
      });
      return next;
    });

    await loadData();
  }, [loadData, selectedWorkflowId]);

  const runSelectedWorkflows = useCallback(async () => {
    if (selectedWorkflowCardIds.length === 0) return;
    for (const workflowId of selectedWorkflowCardIds) {
      await runWorkflowById(workflowId);
    }
    await loadData();
  }, [loadData, runWorkflowById, selectedWorkflowCardIds]);

  const addNodeAt = (type: NodeKind, dropPoint?: { x: number; y: number }) => {
    if (!selectedWorkflow) return;
    const bodyNodes = selectedWorkflow.nodes.filter(node => node.id !== START_NODE_ID && node.id !== END_NODE_ID);
    const canvasNode = createCanvasNode(type, bodyNodes.length);
    const fallbackPosition = getStructuredNodePosition(bodyNodes.length);
    const desiredX = dropPoint ? dropPoint.x - NODE_WIDTH / 2 : fallbackPosition.x;
    const desiredY = dropPoint ? dropPoint.y - NODE_HEIGHT / 2 : fallbackPosition.y;
    const newNode: WorkflowNode = {
      ...canvasNode,
      position: {
        x: Math.max(24, Math.min(CANVAS_WIDTH - 280, desiredX)),
        y: Math.max(24, Math.min(CANVAS_HEIGHT - 120, desiredY)),
      },
      config: {
        ...canvasNode.config,
      },
    };

    const nextNodes = [...selectedWorkflow.nodes, newNode];

    updateSelectedWorkflow(workflow => ({
      ...workflow,
      nodes: nextNodes,
      edges: buildEdges(nextNodes),
    }));
    setSelectedNodeId(newNode.id);
    setShowLibrary(false);
    setLibraryQuery('');
  };

  const addNode = (type: NodeKind) => addNodeAt(type);

  const addNodeBetweenEdge = (type: NodeKind, edge: { source: string; target: string; sourceHandle?: string }) => {
    if (!selectedWorkflow) return;
    const sourceNode = selectedWorkflow.nodes.find(node => node.id === edge.source);
    const targetNode = selectedWorkflow.nodes.find(node => node.id === edge.target);
    if (!sourceNode || !targetNode) return;

    const midpoint = {
      x: ((sourceNode.position?.x || 0) + NODE_WIDTH + (targetNode.position?.x || 0)) / 2,
      y: ((sourceNode.position?.y || 0) + 52 + (targetNode.position?.y || 0) + 52) / 2,
    };

    const bodyNodes = selectedWorkflow.nodes.filter(node => node.id !== START_NODE_ID && node.id !== END_NODE_ID);
    const template = createCanvasNode(type, bodyNodes.length);
    const insertedNode: WorkflowNode = {
      ...template,
      position: {
        x: Math.max(24, Math.min(CANVAS_WIDTH - 280, midpoint.x - NODE_WIDTH / 2)),
        y: Math.max(24, Math.min(CANVAS_HEIGHT - 120, midpoint.y - NODE_HEIGHT / 2)),
      },
      config: {
        ...template.config,
        ...(type !== 'parallel' ? { inputNode: edge.source } : {}),
      },
    };

    updateSelectedWorkflow(workflow => {
      const nodes = workflow.nodes.map(node => {
        if (node.id === edge.source && node.type === 'condition' && isConditionHandle(edge.sourceHandle)) {
          return {
            ...node,
            config: {
              ...node.config,
              [edge.sourceHandle === 'true' ? 'trueNodeId' : 'falseNodeId']: insertedNode.id,
            },
          };
        }
        if (node.id === edge.target) {
          if (node.type === 'parallel') {
            const sourceIds = Array.isArray(node.config.sourceNodeIds) ? (node.config.sourceNodeIds as string[]) : [];
            return {
              ...node,
              config: {
                ...node.config,
                sourceNodeIds: Array.from(new Set(sourceIds.map(item => item === edge.source ? insertedNode.id : item))),
              },
            };
          }
          return {
            ...node,
            config: {
              ...node.config,
              inputNode: insertedNode.id,
            },
          };
        }
        return node;
      });

      const nextNodes = [...nodes, insertedNode];
      return {
        ...workflow,
        nodes: nextNodes,
        edges: buildEdges(nextNodes),
      };
    });

    setSelectedNodeId(insertedNode.id);
    setSelectedNodeIds([insertedNode.id]);
    setEdgeInsertMenu(null);
    setSelectedEdgeId(null);
  };

  const removeNodes = useCallback((nodeIds: string[]) => {
    const removableIds = Array.from(new Set(nodeIds)).filter(id => id !== START_NODE_ID && id !== END_NODE_ID);
    if (removableIds.length === 0) return;
    const removableSet = new Set(removableIds);

    updateSelectedWorkflow(workflow => {
      const nextNodes = workflow.nodes
        .filter(node => !removableSet.has(node.id))
        .map(node => {
          const nextConfig = { ...node.config };
          if (typeof nextConfig.inputNode === 'string' && removableSet.has(String(nextConfig.inputNode))) {
            delete nextConfig.inputNode;
          }
          if ((node.type === 'parallel' || node.type === 'end') && Array.isArray(nextConfig.sourceNodeIds)) {
            nextConfig.sourceNodeIds = (nextConfig.sourceNodeIds as string[]).filter(sourceId => !removableSet.has(sourceId));
          }
          if (node.type === 'condition') {
            if (typeof nextConfig.trueNodeId === 'string' && removableSet.has(String(nextConfig.trueNodeId))) delete nextConfig.trueNodeId;
            if (typeof nextConfig.falseNodeId === 'string' && removableSet.has(String(nextConfig.falseNodeId))) delete nextConfig.falseNodeId;
          }
          return { ...node, config: nextConfig };
        });

      return {
        ...workflow,
        nodes: nextNodes,
        edges: buildEdges(nextNodes),
      };
    });
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  }, [updateSelectedWorkflow]);

  const removeNode = useCallback((nodeId: string) => {
    removeNodes([nodeId]);
  }, [removeNodes]);

  const updateNode = (nodeId: string, patch: Partial<WorkflowNode>) => {
    updateSelectedWorkflow(workflow => ({
      ...workflow,
      nodes: workflow.nodes.map(node => node.id === nodeId ? { ...node, ...patch } : node),
    }));
  };

  const updateNodeConfig = (nodeId: string, patch: Record<string, unknown>) => {
    updateSelectedWorkflow(workflow => ({
      ...workflow,
      nodes: workflow.nodes.map(node => node.id === nodeId ? { ...node, config: { ...node.config, ...patch } } : node),
    }));
  };

  const executeWorkflow = async () => {
    if (!ipcRenderer || !selectedWorkflowId || !selectedWorkflow) return;
    const variables = parseRunVariables();
    const persistedId = await saveWorkflow(selectedWorkflow);
    if (!persistedId) return;
    await ipcRenderer.invoke('workflow:execute', persistedId, variables);
    await loadData();
  };

  const connectNodes = useCallback((sourceNodeId: string, targetNodeId: string, sourceHandle?: string) => {
    if (!targetNodeId.trim()) {
      updateSelectedWorkflow(workflow => {
        if (!isConditionHandle(sourceHandle)) return workflow;
        const nodes = workflow.nodes.map(node => {
          if (node.id !== sourceNodeId || node.type !== 'condition') return node;
          const nextConfig = { ...node.config };
          delete nextConfig[sourceHandle === 'true' ? 'trueNodeId' : 'falseNodeId'];
          return { ...node, config: nextConfig };
        });
        return { ...workflow, nodes, edges: buildEdges(nodes) };
      });
      return;
    }
    if (sourceNodeId === targetNodeId) return;
    updateSelectedWorkflow(workflow => {
      const sourceNode = workflow.nodes.find(node => node.id === sourceNodeId);
      const nodes = workflow.nodes.map(node => {
        if (node.id === sourceNodeId && sourceNode?.type === 'condition' && isConditionHandle(sourceHandle)) {
          return {
            ...node,
            config: {
              ...node.config,
              [sourceHandle === 'true' ? 'trueNodeId' : 'falseNodeId']: targetNodeId,
            },
          };
        }

        if (node.id !== targetNodeId) return node;
        if (node.type === 'end') {
          const existingSources = Array.isArray(node.config.sourceNodeIds)
            ? (node.config.sourceNodeIds as string[])
            : (typeof node.config.inputNode === 'string' && node.config.inputNode ? [String(node.config.inputNode)] : []);
          return {
            ...node,
            config: {
              ...node.config,
              sourceNodeIds: Array.from(new Set([...existingSources, sourceNodeId])),
              inputNode: undefined,
            },
          };
        }
        if (node.type === 'parallel') {
          const existing = Array.isArray(node.config.sourceNodeIds) ? (node.config.sourceNodeIds as string[]) : [];
          return {
            ...node,
            config: {
              ...node.config,
              sourceNodeIds: Array.from(new Set([...existing, sourceNodeId])),
            },
          };
        }
        return {
          ...node,
          config: { ...node.config, inputNode: sourceNodeId },
        };
      });
      return { ...workflow, nodes, edges: buildEdges(nodes) };
    });
  }, [updateSelectedWorkflow]);

  useEffect(() => {
    connectNodesRef.current = connectNodes;
  }, [connectNodes]);

  const removeConnection = useCallback((sourceNodeId: string, targetNodeId: string, sourceHandle?: string) => {
    updateSelectedWorkflow(workflow => {
      const sourceNode = workflow.nodes.find(node => node.id === sourceNodeId);
      const sourceIsCondition = sourceNode?.type === 'condition';
      const removingTrue = sourceIsCondition && sourceHandle === 'true' && String(sourceNode?.config.trueNodeId || '') === targetNodeId;
      const removingFalse = sourceIsCondition && sourceHandle === 'false' && String(sourceNode?.config.falseNodeId || '') === targetNodeId;
      const keepTargetInputFromCondition = sourceIsCondition && (
        (removingTrue && String(sourceNode?.config.falseNodeId || '') === targetNodeId) ||
        (removingFalse && String(sourceNode?.config.trueNodeId || '') === targetNodeId)
      );

      const nodes = workflow.nodes.map(node => {
        if (node.id === sourceNodeId && sourceIsCondition && isConditionHandle(sourceHandle)) {
          const key = sourceHandle === 'true' ? 'trueNodeId' : 'falseNodeId';
          if (String(node.config[key] || '') !== targetNodeId) return node;
          const nextConfig = { ...node.config };
          delete nextConfig[key];
          return { ...node, config: nextConfig };
        }

        if (node.id !== targetNodeId) return node;
        if (node.type === 'end') {
          const existingSources = Array.isArray(node.config.sourceNodeIds)
            ? (node.config.sourceNodeIds as string[])
            : (typeof node.config.inputNode === 'string' && node.config.inputNode ? [String(node.config.inputNode)] : []);
          return {
            ...node,
            config: {
              ...node.config,
              sourceNodeIds: existingSources.filter(item => item !== sourceNodeId),
              inputNode: undefined,
            },
          };
        }
        if (node.type === 'parallel') {
          const existing = Array.isArray(node.config.sourceNodeIds) ? (node.config.sourceNodeIds as string[]) : [];
          return {
            ...node,
            config: {
              ...node.config,
              sourceNodeIds: existing.filter(item => item !== sourceNodeId),
            },
          };
        }
        if (keepTargetInputFromCondition) return node;
        if (String(node.config.inputNode || '') !== sourceNodeId) return node;
        const nextConfig = { ...node.config };
        delete nextConfig.inputNode;
        return { ...node, config: nextConfig };
      });
      return { ...workflow, nodes, edges: buildEdges(nodes) };
    });
  }, [updateSelectedWorkflow]);

  function clearNodeInput(nodeId: string) {
    updateSelectedWorkflow(workflow => {
      const nodes = workflow.nodes.map(node => {
        if (node.id !== nodeId) return node;
        if (node.type === 'end') {
          return { ...node, config: { ...node.config, sourceNodeIds: [], inputNode: undefined } };
        }
        if (node.type === 'parallel') {
          return { ...node, config: { ...node.config, sourceNodeIds: [] } };
        }
        const nextConfig = { ...node.config };
        delete nextConfig.inputNode;
        return { ...node, config: nextConfig };
      });
      return { ...workflow, nodes, edges: buildEdges(nodes) };
    });
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!showEditor || isSpacePressedRef.current) return;
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(target?.closest('input, textarea, [contenteditable="true"]'));
      if (isTypingTarget) return;
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;

      if (selectedEdgeId && selectedWorkflow) {
        const edge = buildEdges(selectedWorkflow.nodes).find(item => item.id === selectedEdgeId);
        if (!edge) return;
        event.preventDefault();
        removeConnection(edge.source, edge.target, edge.sourceHandle);
        setSelectedEdgeId(null);
        return;
      }

      if (selectedNodeIds.length === 0) return;
      const removableNodeIds = selectedNodeIds.filter(id => id !== START_NODE_ID && id !== END_NODE_ID);
      if (removableNodeIds.length === 0) return;
      event.preventDefault();
      removeNodes(removableNodeIds);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [removeConnection, removeNodes, selectedEdgeId, selectedNodeIds, selectedWorkflow, showEditor]);

  const hasInputFrom = (targetNode: WorkflowNode, sourceNodeId: string) => {
    if (targetNode.type === 'end') {
      const sources = Array.isArray(targetNode.config.sourceNodeIds)
        ? (targetNode.config.sourceNodeIds as string[])
        : (typeof targetNode.config.inputNode === 'string' && targetNode.config.inputNode ? [String(targetNode.config.inputNode)] : []);
      return sources.includes(sourceNodeId);
    }
    if (targetNode.type === 'parallel') {
      const sources = Array.isArray(targetNode.config.sourceNodeIds) ? (targetNode.config.sourceNodeIds as string[]) : [];
      return sources.includes(sourceNodeId);
    }
    return String(targetNode.config.inputNode || '') === sourceNodeId;
  };

  const beginReconnectFromEdge = (
    event: React.PointerEvent<SVGCircleElement>,
    edge: { id: string; source: string; target: string; sourceHandle?: string },
  ) => {
    event.stopPropagation();
    removeConnection(edge.source, edge.target, edge.sourceHandle);
    const point = toCanvasPoint(event.clientX, event.clientY);
    setSelectedEdgeId(edge.id);
    setLinkingFrom({ nodeId: edge.source, sourceHandle: edge.sourceHandle });
    setReconnectingEdge({
      sourceNodeId: edge.source,
      sourceHandle: edge.sourceHandle,
      oldTargetNodeId: edge.target,
    });
    setDraftLink({
      sourceNodeId: edge.source,
      sourceHandle: edge.sourceHandle,
      x: point.x,
      y: point.y,
    });
    dragPointerRef.current = { x: event.clientX, y: event.clientY };
    setBodyInteraction({ cursor: 'crosshair', lockSelection: true });
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>, node: WorkflowNode) => {
    const point = toCanvasPoint(event.clientX, event.clientY);
    const alreadySelected = selectedNodeIdsRef.current.includes(node.id);
    const currentWorkflow = selectedWorkflowId
      ? workflowsRef.current.find(workflow => workflow.id === selectedWorkflowId) || null
      : null;
    if (currentWorkflow) {
      dragStartSnapshotRef.current = cloneWorkflowSnapshot(currentWorkflow);
    }
    setAlignmentGuides({ x: null, y: null });

    if (alreadySelected && selectedNodeIdsRef.current.length > 1 && currentWorkflow) {
      const original: Record<string, { x: number; y: number }> = {};
      for (const selectedId of selectedNodeIdsRef.current) {
        const selectedNode = currentWorkflow.nodes.find(item => item.id === selectedId);
        if (!selectedNode) continue;
        original[selectedId] = {
          x: selectedNode.position?.x || 0,
          y: selectedNode.position?.y || 0,
        };
      }
      dragState.current = {
        mode: 'group',
        nodeIds: [...selectedNodeIdsRef.current],
        anchorX: point.x,
        anchorY: point.y,
        original,
      };
    } else {
      setSelectedNodeIds([node.id]);
      setSelectedNodeId(node.id);
      const nodeX = node.position?.x || 0;
      const nodeY = node.position?.y || 0;
      dragState.current = {
        mode: 'single',
        nodeId: node.id,
        offsetX: point.x - nodeX,
        offsetY: point.y - nodeY,
      };
    }
    setBodyInteraction({ cursor: 'grabbing', lockSelection: true });
  };

  const beginCanvasPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-node-card="true"], [data-node-port="true"], [data-edge-hit="true"], [data-edge-control="true"], [data-edge-insert-menu="true"]')) return;
    dragStartSnapshotRef.current = null;
    setAlignmentGuides({ x: null, y: null });
    setSelectedEdgeId(null);
    if (event.button === 1 || isSpacePressedRef.current || event.altKey) {
      panState.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: canvasViewportRef.current.x,
        originY: canvasViewportRef.current.y,
      };
      setBodyInteraction({ cursor: 'grabbing', lockSelection: true });
    } else {
      const point = toCanvasPoint(event.clientX, event.clientY);
      selectionState.current = { startX: point.x, startY: point.y };
      setSelectionBox({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      setBodyInteraction({ cursor: 'crosshair', lockSelection: true });
    }
    dragPointerRef.current = { x: event.clientX, y: event.clientY };
    setLinkingFrom(null);
    setEdgeInsertMenu(null);
  };

  const zoomCanvas = (delta: number) => {
    setCanvasViewport(prev => ({
      ...prev,
      zoom: clampZoom(prev.zoom + delta),
    }));
  };

  const resetCanvasView = useCallback(() => {
    setCanvasViewport({ x: 120, y: 72, zoom: 1 });
  }, []);

  const fitCanvasToNodes = useCallback(() => {
    if (!selectedWorkflow || selectedWorkflow.nodes.length === 0) {
      resetCanvasView();
      return;
    }
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const minX = Math.min(...selectedWorkflow.nodes.map(node => node.position?.x || 0));
    const minY = Math.min(...selectedWorkflow.nodes.map(node => node.position?.y || 0));
    const maxX = Math.max(...selectedWorkflow.nodes.map(node => (node.position?.x || 0) + NODE_WIDTH));
    const maxY = Math.max(...selectedWorkflow.nodes.map(node => (node.position?.y || 0) + NODE_HEIGHT));

    const contentWidth = Math.max(320, maxX - minX);
    const contentHeight = Math.max(180, maxY - minY);
    const padding = 88;

    const zoom = clampZoom(Math.min(
      (rect.width - padding * 2) / contentWidth,
      (rect.height - padding * 2) / contentHeight,
    ));

    setCanvasViewport({
      zoom,
      x: (rect.width - contentWidth * zoom) / 2 - minX * zoom,
      y: (rect.height - contentHeight * zoom) / 2 - minY * zoom,
    });
  }, [clampZoom, resetCanvasView, selectedWorkflow]);

  const arrangeSelectedWorkflow = useCallback(() => {
    if (!selectedWorkflow) return;
    updateSelectedWorkflow(workflow => {
      const nodes = autoLayoutWorkflowNodes(workflow.nodes);
      return {
        ...workflow,
        nodes,
        edges: buildEdges(nodes),
      };
    });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        fitCanvasToNodes();
      });
    });
  }, [fitCanvasToNodes, selectedWorkflow, updateSelectedWorkflow]);

  useEffect(() => {
    if (!showEditor || !selectedWorkflow) return;
    const handle = window.requestAnimationFrame(() => {
      fitCanvasToNodes();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [fitCanvasToNodes, selectedWorkflow, selectedWorkflowId, showEditor]);

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const prev = canvasViewportRef.current;
    if (event.ctrlKey || event.metaKey || event.altKey) {
      event.preventDefault();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const nextZoom = clampZoom(prev.zoom * (event.deltaY < 0 ? 1.08 : 0.92));
      const scale = nextZoom / prev.zoom;

      setCanvasViewport({
        zoom: nextZoom,
        x: pointerX - (pointerX - prev.x) * scale,
        y: pointerY - (pointerY - prev.y) * scale,
      });
      return;
    }

    event.preventDefault();
    setCanvasViewport({
      ...prev,
      x: prev.x - event.deltaX * 0.7,
      y: prev.y - event.deltaY * 0.7,
    });
  };

  const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const payloadType = event.dataTransfer.types.includes('application/easyworkflow-node');
    if (!payloadType) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const rawType = event.dataTransfer.getData('application/easyworkflow-node');
    if (!rawType) return;
    const nodeType = rawType as NodeKind;
    const valid = NODE_LIBRARY.some(item => item.type === nodeType);
    if (!valid) return;
    event.preventDefault();
    const point = toCanvasPoint(event.clientX, event.clientY);
    setEdgeInsertMenu(null);
    addNodeAt(nodeType, point);
  };

  return (
    <UIPageShell>
      <UIPageHeader
        kicker="Management Page"
        title="工作流工作台"
        description="中枢控制管理器运行，工作流编辑器设置流程，循环生管理器不同和任务。"
        actions={
          <>
            <UIButton onClick={createWorkflow} tone="primary" size="lg" className="min-w-[11rem] bg-blue-600 text-white hover:bg-blue-500">
              <Plus size={16} />
              新建工作流
            </UIButton>
            <UIButton tone="ghost" size="lg" className="min-w-[7rem] border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/85">
              <SlidersHorizontal size={16} />
              筛选
            </UIButton>
            {onClose && (
              <UIButton onClick={onClose} tone="ghost" size="icon" className="h-11 w-11 rounded-2xl border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/70">
                <X size={18} />
              </UIButton>
            )}
          </>
        }
      >
        <div className="mt-7 flex items-center gap-4">
          <div className="relative min-w-0 flex-1">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/35" />
            <UIInput
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="搜索工作流..."
              className="h-16 rounded-[1.35rem] pl-14 text-[15px]"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(category => (
            <UIButton
              key={category}
              tone={categoryFilter === category ? 'primary' : 'ghost'}
              size="md"
              className={`shrink-0 rounded-2xl px-6 ${
                categoryFilter === category
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/70'
              }`}
              onClick={() => setCategoryFilter(category)}
            >
              {category === 'all' ? '全部' : category}
            </UIButton>
          ))}
        </div>
      </UIPageHeader>

      <UIPageBody>
        {selectedWorkflowCardIds.length > 0 && (
          <UIPanel className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-blue-400/18 bg-[linear-gradient(180deg,rgba(31,46,74,0.94),rgba(16,24,40,0.98))] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/74">
              <span className="rounded-full border border-blue-300/18 bg-blue-500/12 px-3 py-1 text-xs font-medium text-blue-100">
                已选 {selectedWorkflowCardIds.length} 个工作流
              </span>
              <span className="text-white/40">支持批量运行、删除和清空选择</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UIButton onClick={selectAllVisibleWorkflows} tone="ghost" size="sm" className="border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/72">
                <CheckSquare size={14} />
                全选结果
              </UIButton>
              <UIButton onClick={runSelectedWorkflows} tone="neutral" size="sm" className="border-emerald-400/18 bg-emerald-500/12 text-emerald-100">
                <Play size={14} />
                批量运行
              </UIButton>
              <UIButton onClick={() => void deleteWorkflowsByIds(selectedWorkflowCardIds)} tone="ghost" size="sm" className="border-red-400/14 bg-red-500/[0.06] text-red-200">
                <Trash2 size={14} />
                批量删除
              </UIButton>
              <UIButton onClick={clearWorkflowCardSelection} tone="ghost" size="sm" className="border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/68">
                清空选择
              </UIButton>
            </div>
          </UIPanel>
        )}

        <UICardGrid>
          {filteredWorkflows.map(workflow => {
            const isActive = selectedWorkflowId === workflow.id;
            const isBulkSelected = selectedWorkflowCardIds.includes(workflow.id);
            const workflowRuns = runs.filter(run => run.workflow_id === workflow.id);
            const lastRun = workflowRuns[0];
            const isDraft = workflow.tags.includes('draft') || temporaryWorkflowIdSet.has(workflow.id);

            return (
              <UIListCard
                key={workflow.id}
                className={`transition-all ${
                  isBulkSelected
                    ? 'border-blue-300/38 bg-[linear-gradient(180deg,rgba(37,99,235,0.08),rgba(15,23,42,0.88))] shadow-[0_0_0_1px_rgba(96,165,250,0.14)]'
                    : isActive
                      ? 'border-blue-400/28 bg-[var(--panel-bg)]/82 shadow-[0_0_0_1px_rgba(59,130,246,0.14)]'
                      : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        onClick={event => {
                          event.stopPropagation();
                          toggleWorkflowCardSelection(workflow.id);
                        }}
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                          isBulkSelected
                            ? 'border-blue-300/28 bg-blue-500/16 text-blue-100'
                            : 'border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/46 hover:text-white/72'
                        }`}
                        aria-label={isBulkSelected ? '取消选择工作流' : '选择工作流'}
                      >
                        {isBulkSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedWorkflowId(workflow.id);
                          setSelectedNodeId(null);
                          setSelectedNodeIds([]);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="truncate text-[18px] font-semibold text-white">{workflow.name}</h3>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${
                              isDraft
                                ? 'border-amber-400/24 bg-amber-500/10 text-amber-200'
                                : 'border-emerald-400/24 bg-emerald-500/10 text-emerald-200'
                            }`}
                          >
                            {isDraft ? <Clock3 size={13} /> : <CheckCircle2 size={13} />}
                            {isDraft ? '草稿' : '活跃'}
                          </span>
                        </div>
                        <p className="mt-2.5 text-[13px] leading-6 text-white/48">
                          {workflow.description || '定义 EasyTerminal AI Agent 执行流程'}
                        </p>
                      </button>

                      <UIButton
                        tone="ghost"
                        size="icon"
                        onClick={() => void deleteWorkflowsByIds([workflow.id])}
                        className="h-9 w-9 shrink-0 rounded-2xl border-red-400/10 bg-red-500/[0.04] text-red-300 hover:bg-red-500/[0.1]"
                      >
                        <Trash2 size={15} />
                      </UIButton>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-white/40">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 size={14} />
                        最后运行: {lastRun ? new Date(lastRun.started_at).toLocaleDateString() : '暂无记录'}
                      </span>
                      <span>运行次数: {workflowRuns.length}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <UIBadge className="bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] text-white/72">{workflow.category || 'general'}</UIBadge>
                      {workflow.tags.map(tag => (
                        <UIBadge key={tag} className="bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] text-white/72">{tag}</UIBadge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <UIButton
                      onClick={() => {
                        setSelectedWorkflowId(workflow.id);
                        setSelectedNodeId(null);
                        setSelectedNodeIds([]);
                        setShowEditor(true);
                      }}
                      tone="primary"
                      size="sm"
                      className="min-w-[8.75rem] bg-blue-600 text-white hover:bg-blue-500"
                    >
                      <PencilLine size={14} />
                      编辑工作流
                    </UIButton>
                    <UIButton
                      onClick={() => void runWorkflowById(workflow.id)}
                      tone="neutral"
                      size="sm"
                      className="min-w-[6.5rem] border-[var(--panel-border)] bg-[var(--surface-muted)]"
                    >
                      <Play size={14} />
                      运行
                    </UIButton>
                    <UIButton
                      onClick={() => duplicateWorkflow(workflow)}
                      tone="ghost"
                      size="sm"
                      className="min-w-[6.5rem] border-[var(--panel-border)] bg-[var(--surface-muted)]"
                    >
                      <Copy size={14} />
                      复制
                    </UIButton>
                  </div>

                  <div className="mt-4 border-t border-[var(--panel-border)]/60 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {workflow.nodes.length > 0 ? (
                        workflow.nodes.slice(0, 4).map(node => (
                          <span key={node.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] text-white/62">
                            {nodeIcon(node.type)}
                            <span>{node.label}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-white/28">还没有节点，点击“编辑工作流”开始搭建。</span>
                      )}
                    </div>
                  </div>
                </div>
              </UIListCard>
            );
          })}

          {filteredWorkflows.length === 0 && (
            <UIPanel className="rounded-[1.8rem] border-dashed bg-[var(--panel-bg)]/62 px-6 py-14 text-center text-sm text-white/35 md:col-span-2 2xl:col-span-3">
              还没有工作流，先创建一个草稿吧
            </UIPanel>
          )}
        </UICardGrid>
      </UIPageBody>

      {showEditor && selectedWorkflow && (
        <UIOverlayPage>
          <div className="flex h-[5.4rem] shrink-0 items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)]/88 pl-6 pr-5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <UIButton onClick={requestCloseEditor} tone="ghost" size="icon" className="h-10 w-10 rounded-2xl border-[var(--panel-border)] bg-transparent text-white/70 hover:bg-[var(--surface-muted)]">
                    <ArrowLeft size={18} />
                  </UIButton>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-violet-300/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.95),rgba(96,165,250,0.72))] shadow-[0_12px_34px_rgba(91,33,182,0.28)]">
                    <Wand2 size={17} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] tracking-[0.24em] text-white/34">WORKFLOW EDITOR</div>
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[18px] font-semibold tracking-tight text-white">工作流编辑器</h2>
                      {isSelectedWorkflowDirty && (
                        <span className="inline-flex rounded-full border border-amber-300/18 bg-amber-500/12 px-2 py-0.5 text-[10px] font-medium text-amber-100">
                          未保存
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5" style={noDragRegionStyle}>
                <UIButton onClick={() => setShowLibrary(true)} tone="primary" size="md" className="min-w-[8.5rem] bg-blue-600 text-white hover:bg-blue-500">
                  <Plus size={13} />
                  添加节点
                </UIButton>
                <UIButton
                  onClick={() => setShowNodeList(prev => !prev)}
                  tone={showNodeList ? 'primary' : 'ghost'}
                  size="md"
                  className={showNodeList ? 'min-w-[7rem] border-blue-400/20 bg-blue-500/14 text-white' : 'min-w-[7rem] border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/74'}
                >
                  <List size={14} />
                  节点列表
                </UIButton>
                <UIButton
                  onClick={() => setShowNodeConfig(prev => !prev)}
                  tone={showNodeConfig ? 'primary' : 'ghost'}
                  size="md"
                  className={showNodeConfig ? 'min-w-[7rem] border-blue-400/20 bg-blue-500/14 text-white' : 'min-w-[7rem] border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/74'}
                >
                  <SlidersHorizontal size={14} />
                  配置面板
                </UIButton>
                <UIButton onClick={() => void saveWorkflow(selectedWorkflow)} tone="neutral" size="md" className="min-w-[5.5rem] border-[var(--panel-border)] bg-[var(--surface-muted)]">保存</UIButton>
                <UIButton onClick={executeWorkflow} tone="success" size="md" className="min-w-[7rem] bg-emerald-600/18 text-emerald-100 border-emerald-400/22">
                  <Play size={13} />
                  试运行
                </UIButton>
                <UIButton onClick={requestCloseEditor} tone="ghost" size="icon" className="h-10 w-10 rounded-2xl border-[var(--panel-border)] bg-[var(--surface-muted)]">
                  <X size={18} />
                </UIButton>
              </div>
            </div>

          <div className="shrink-0 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]/66 px-6 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/78">
                  <span className="text-white/38">当前工作流</span>
                  <span className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3.5 py-1.5 font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {selectedWorkflow.name}
                  </span>
                  <UIBadge className="bg-[var(--surface-muted)] text-white/72">{selectedWorkflow.category || 'general'}</UIBadge>
                  <UIBadge className="bg-[var(--surface-muted)] text-white/72">
                    {selectedWorkflow.nodes.filter(node => node.id !== START_NODE_ID && node.id !== END_NODE_ID).length} 个节点
                  </UIBadge>
                  {selectedWorkflow.tags.slice(0, 2).map(tag => (
                    <UIBadge key={tag} tone="info" className="border border-sky-300/12 bg-sky-400/[0.12] text-sky-100">{tag}</UIBadge>
                  ))}
                </div>
                <div className="text-xs text-white/42">
                  编排、连接与配置在当前画布完成
                </div>
              </div>
            </div>

          <div className="flex min-h-0 flex-1">
              {showNodeList && (
                <div className="w-[15rem] shrink-0 border-r border-[var(--panel-border)] bg-[linear-gradient(180deg,rgba(15,20,32,0.95),rgba(10,15,26,0.98))] p-4">
                <UISectionKicker className="tracking-[0.22em] text-white/30">节点</UISectionKicker>
                <div className="mt-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/28" />
                    <UIInput
                      value={nodePanelQuery}
                      onChange={event => setNodePanelQuery(event.target.value)}
                      placeholder="搜索节点"
                      className="h-10 rounded-2xl pl-9 text-[13px]"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(97vh - 310px)' }}>
                  {visibleCanvasNodes.map(node => (
                    <UIButton
                      key={node.id}
                      onClick={event => {
                        if (event.shiftKey) {
                          setSelectedNodeIds(prev => prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]);
                          setSelectedNodeId(node.id);
                          return;
                        }
                        setSelectedNodeIds([node.id]);
                        setSelectedNodeId(node.id);
                      }}
                      tone="ghost"
                      className={`h-auto w-full justify-start rounded-[1.15rem] border px-3 py-2.5 text-left ${
                        selectedNodeIds.includes(node.id) || selectedNodeId === node.id
                            ? 'border-sky-400/28 bg-[linear-gradient(180deg,rgba(56,189,248,0.10),rgba(32,46,74,0.88))] shadow-[0_12px_26px_rgba(14,165,233,0.10)]'
                            : 'border-[var(--panel-border)] bg-[linear-gradient(180deg,rgba(28,36,55,0.9),rgba(18,24,40,0.98))] hover:border-[var(--panel-border-glow)] hover:bg-[linear-gradient(180deg,rgba(34,43,64,0.95),rgba(21,29,46,0.99))]'
                      }`}
                    >
                      <div className="w-full">
                        <div className="flex items-center gap-2.5">
                          <span className="shrink-0">{nodeIcon(node.type)}</span>
                          <span className="truncate text-[14px] font-medium text-white">{node.label}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-[0.14em] text-white/34">{node.type}</span>
                          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] text-white/42">
                            {node.id === START_NODE_ID ? '输入' : node.id === END_NODE_ID ? '输出' : '节点'}
                          </span>
                        </div>
                      </div>
                    </UIButton>
                  ))}
                </div>

                <div className="mt-4 border-t border-[var(--panel-border)] pt-4">
                  <UISectionKicker className="tracking-[0.22em] text-white/30">节点库</UISectionKicker>
                  <div className="mt-2 text-[11px] leading-5 text-white/40">可拖拽到画布创建节点</div>
                  <div className="mt-3 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(97vh - 560px)' }}>
                    {Object.entries(libraryItemsByCategory).map(([category, items]) => (
                      <div key={category}>
                        <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-white/26">{category}</div>
                        <div className="space-y-1.5">
                          {items.map(item => (
                            <button
                              key={`quicklib-${item.type}`}
                              draggable
                              onDragStart={event => {
                                event.dataTransfer.setData('application/easyworkflow-node', item.type);
                                event.dataTransfer.effectAllowed = 'copy';
                              }}
                              onClick={() => addNode(item.type)}
                              className="w-full rounded-[1rem] border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-left transition-colors hover:border-[var(--panel-border-glow)] hover:bg-white/[0.085]"
                              title="拖拽到画布或点击添加"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="shrink-0">{nodeIcon(item.type)}</span>
                                  <span className="truncate text-[13px] font-medium text-white">{item.label}</span>
                                </div>
                                <span className="rounded-full border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] text-white/34">拖拽</span>
                              </div>
                              <div className="mt-1 text-[11px] leading-5 text-white/35">{item.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              )}

              <div
                ref={canvasContainerRef}
                className="relative min-w-0 flex-1 overflow-hidden cursor-grab bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.04),transparent_26%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.03),transparent_24%),linear-gradient(180deg,rgba(14,18,29,0.98),rgba(10,14,24,0.99)),radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.10)_1px,transparent_0)] [background-size:auto,auto,auto,22px_22px]"
                onPointerDown={beginCanvasPan}
                onWheel={handleCanvasWheel}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
              >
                <div
                  className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 items-center gap-1 rounded-[1.15rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/88 px-2 py-2 shadow-[0_20px_45px_rgba(0,0,0,0.24)]"
                >
                  <UIButton onClick={undoWorkflow} tone="ghost" size="icon" className="h-8 w-8 rounded-xl bg-[var(--surface-muted)]" disabled={!canUndo}>
                    <Undo2 size={13} />
                  </UIButton>
                  <UIButton onClick={redoWorkflow} tone="ghost" size="icon" className="h-8 w-8 rounded-xl bg-[var(--surface-muted)]" disabled={!canRedo}>
                    <Redo2 size={13} />
                  </UIButton>
                  <div className="mx-1 h-6 w-px bg-white/10" />
                  <UIButton onClick={() => zoomCanvas(-0.1)} tone="ghost" size="icon" className="h-8 w-8 rounded-xl bg-[var(--surface-muted)]">
                    <ZoomOut size={14} />
                  </UIButton>
                  <span className="min-w-[3rem] text-center text-[11px] font-medium text-white/66">{Math.round(canvasViewport.zoom * 100)}%</span>
                  <UIButton onClick={() => zoomCanvas(0.1)} tone="ghost" size="icon" className="h-8 w-8 rounded-xl bg-[var(--surface-muted)]">
                    <ZoomIn size={14} />
                  </UIButton>
                  <UIButton onClick={fitCanvasToNodes} tone="ghost" size="sm" className="h-8 rounded-xl px-3 text-[11px] bg-[var(--surface-muted)]">
                    FIT
                  </UIButton>
                  <UIButton onClick={arrangeSelectedWorkflow} tone="ghost" size="sm" className="h-8 rounded-xl px-3 text-[11px] bg-[var(--surface-muted)]">
                    整理
                  </UIButton>
                  <UIButton onClick={resetCanvasView} tone="ghost" size="icon" className="h-8 w-8 rounded-xl bg-[var(--surface-muted)]">
                    <RotateCcw size={13} />
                  </UIButton>
                </div>
                <div className="pointer-events-none absolute bottom-5 left-5 z-20 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 px-3.5 py-1.5 text-[10px] text-white/58 shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
                  框选多节点 · Shift 追加选择 · Space/Alt 平移 · 整理自动排布
                </div>
                {linkingFrom && (
                  <div className="absolute left-4 top-4 z-20 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] text-cyan-100">
                    连线模式（{linkingFrom.sourceHandle === 'true' ? 'True 分支' : linkingFrom.sourceHandle === 'false' ? 'False 分支' : '普通输出'}）：请点击目标节点左侧输入端口，或再次点击起点取消
                  </div>
                )}
                {selectionBox && (
                  <div
                    className="pointer-events-none absolute z-20 border border-blue-300/80 bg-blue-400/10"
                    style={{
                      left: canvasViewport.x + Math.min(selectionBox.startX, selectionBox.endX) * canvasViewport.zoom,
                      top: canvasViewport.y + Math.min(selectionBox.startY, selectionBox.endY) * canvasViewport.zoom,
                      width: Math.abs(selectionBox.endX - selectionBox.startX) * canvasViewport.zoom,
                      height: Math.abs(selectionBox.endY - selectionBox.startY) * canvasViewport.zoom,
                    }}
                  />
                )}

                <div
                  className="absolute left-0 top-0"
                  style={{
                    width: `${CANVAS_WIDTH}px`,
                    height: `${CANVAS_HEIGHT}px`,
                    transform: `translate(${canvasViewport.x}px, ${canvasViewport.y}px) scale(${canvasViewport.zoom})`,
                    transformOrigin: '0 0',
                  }}
                >
                  <svg className="absolute inset-0 h-full w-full">
                    {buildEdges(selectedWorkflow.nodes).map(edge => {
                      const source = selectedWorkflow.nodes.find(node => node.id === edge.source);
                      const target = selectedWorkflow.nodes.find(node => node.id === edge.target);
                      if (!source || !target) return null;
                      const isEdgeSelected = selectedEdgeId === edge.id;
                      const path = edgePath(source, target);
                      const startX = (source.position?.x || 0) + NODE_WIDTH;
                      const startY = (source.position?.y || 0) + 52;
                      const endX = (target.position?.x || 0);
                      const endY = (target.position?.y || 0) + 52;
                      const reconnectHandleX = endX - 14;
                      const reconnectHandleY = endY;
                      const midX = (startX + endX) / 2;
                      const midY = (startY + endY) / 2;
                      const stroke = edge.sourceHandle === 'true'
                        ? 'rgba(16, 185, 129, 0.72)'
                        : edge.sourceHandle === 'false'
                          ? 'rgba(248, 113, 113, 0.72)'
                          : 'rgba(226,232,240,0.34)';
                      return (
                        <g key={edge.id}>
                          <path
                            d={path}
                            fill="none"
                            stroke={isEdgeSelected ? 'rgba(125, 211, 252, 0.92)' : stroke}
                            strokeWidth={isEdgeSelected ? '3.2' : '2.5'}
                            strokeLinecap="round"
                          />
                          <path
                            data-edge-hit="true"
                            d={path}
                            fill="none"
                            stroke={isEdgeSelected ? 'rgba(56,189,248,0.01)' : 'transparent'}
                            strokeWidth="14"
                            className="cursor-pointer"
                            onClick={event => {
                              event.stopPropagation();
                              setSelectedEdgeId(edge.id);
                            }}
                          />
                          <g
                            data-edge-control="true"
                            className="cursor-pointer"
                            onClick={event => {
                              event.stopPropagation();
                              setEdgeInsertMenu({
                                source: edge.source,
                                target: edge.target,
                                sourceHandle: edge.sourceHandle,
                                x: midX,
                              y: midY,
                              });
                              setSelectedEdgeId(edge.id);
                            }}
                          >
                            <circle
                              data-edge-control="true"
                              cx={midX}
                              cy={midY}
                              r="8"
                              fill="rgba(15, 23, 42, 0.92)"
                              stroke="rgba(148,163,184,0.75)"
                              strokeWidth="1.5"
                            />
                            <text
                              data-edge-control="true"
                              x={midX}
                              y={midY + 3.5}
                              fill="rgba(226,232,240,0.95)"
                              fontSize="10"
                              textAnchor="middle"
                            >
                              +
                            </text>
                          </g>
                          {isEdgeSelected && (
                            <>
                              <circle
                                data-edge-control="true"
                                cx={reconnectHandleX}
                                cy={reconnectHandleY}
                                r="7"
                                fill="rgba(15,23,42,0.96)"
                                stroke="rgba(56,189,248,0.85)"
                                strokeWidth="2"
                                className="cursor-crosshair"
                                onPointerDown={event => beginReconnectFromEdge(event, edge)}
                              />
                              <circle
                                data-edge-control="true"
                                cx={reconnectHandleX}
                                cy={reconnectHandleY}
                                r="14"
                                fill="transparent"
                                className="cursor-crosshair"
                                onPointerDown={event => beginReconnectFromEdge(event, edge)}
                              />
                              <circle
                                data-edge-control="true"
                                cx={midX + 22}
                                cy={midY}
                                r="8"
                                fill="rgba(127,29,29,0.92)"
                                stroke="rgba(248,113,113,0.8)"
                                strokeWidth="1.5"
                                className="cursor-pointer"
                                onClick={event => {
                                  event.stopPropagation();
                                  removeConnection(edge.source, edge.target, edge.sourceHandle);
                                  setSelectedEdgeId(null);
                                }}
                              />
                              <text
                                data-edge-control="true"
                                x={midX + 22}
                                y={midY + 3}
                                fill="rgba(254,226,226,0.96)"
                                fontSize="11"
                                textAnchor="middle"
                                className="pointer-events-none"
                              >
                                ×
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}
                    {draftLink && (() => {
                      const source = selectedWorkflow.nodes.find(node => node.id === draftLink.sourceNodeId);
                      if (!source) return null;
                      const startX = (source.position?.x || 0) + NODE_WIDTH;
                      const startY = (source.position?.y || 0) + 52;
                      const endX = draftLink.x;
                      const endY = draftLink.y;
                      const controlX = startX + (endX - startX) / 2;
                      return (
                        <path
                          d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
                          fill="none"
                          stroke={
                            draftLink.sourceHandle === 'true'
                              ? 'rgba(16, 185, 129, 0.95)'
                              : draftLink.sourceHandle === 'false'
                                ? 'rgba(248, 113, 113, 0.95)'
                                : 'rgba(56, 189, 248, 0.88)'
                          }
                          strokeWidth="2.5"
                          strokeDasharray="5 5"
                          strokeLinecap="round"
                        />
                      );
                    })()}
                  </svg>

                  {alignmentGuides.x !== null && (
                    <div
                      className="pointer-events-none absolute top-0 w-px bg-cyan-300/70"
                      style={{ left: alignmentGuides.x, height: CANVAS_HEIGHT }}
                    />
                  )}
                  {alignmentGuides.y !== null && (
                    <div
                      className="pointer-events-none absolute left-0 h-px bg-cyan-300/70"
                      style={{ top: alignmentGuides.y, width: CANVAS_WIDTH }}
                    />
                  )}

                  {selectedWorkflow.nodes.map(node => {
                    const linkedFromCurrentSource = linkingFrom ? hasInputFrom(node, linkingFrom.nodeId) : false;
                    const isNodeSelected = selectedNodeIds.includes(node.id) || selectedNodeId === node.id;
                    return (
                      <div
                        key={node.id}
                        data-node-card="true"
                        className={`absolute w-[14rem] rounded-[1.55rem] border p-4 shadow-[0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-colors ${
                          isNodeSelected
                            ? 'border-sky-300/75 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(18,24,40,0.96))] shadow-[0_0_0_1px_rgba(125,211,252,0.26),0_24px_52px_rgba(37,99,235,0.08)]'
                            : 'border-white/16 bg-[linear-gradient(180deg,rgba(21,27,41,0.94),rgba(13,18,29,0.98))] hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(25,31,47,0.96),rgba(16,22,34,0.99))]'
                        }`}
                        style={{
                          left: node.position?.x || 0,
                          top: node.position?.y || 0,
                        }}
                        onPointerDown={event => {
                          event.stopPropagation();
                          beginDrag(event, node);
                        }}
                        onClick={event => {
                          event.stopPropagation();
                          setSelectedEdgeId(null);
                          if (event.shiftKey) {
                            setSelectedNodeIds(prev => prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]);
                            setSelectedNodeId(node.id);
                            return;
                          }
                          setSelectedNodeIds([node.id]);
                          setSelectedNodeId(node.id);
                        }}
                      >
                      {node.id !== START_NODE_ID && (
                        <button
                          data-node-port="true"
                          data-node-input-port-for={node.id}
                          onPointerDown={event => event.stopPropagation()}
                          onClick={event => {
                            event.stopPropagation();
                            if (event.altKey) {
                              clearNodeInput(node.id);
                              setLinkingFrom(null);
                              setReconnectingEdge(null);
                              setSelectedEdgeId(null);
                              return;
                            }
                            if (linkingFrom) {
                              connectNodes(linkingFrom.nodeId, node.id, linkingFrom.sourceHandle);
                              setSelectedNodeId(node.id);
                              setSelectedNodeIds([node.id]);
                              setLinkingFrom(null);
                              setReconnectingEdge(null);
                              setSelectedEdgeId(null);
                            }
                          }}
                          className={`absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border transition-colors ${
                            linkedFromCurrentSource
                              ? 'border-emerald-300 bg-emerald-400/35'
                              : linkingFrom
                                ? 'border-cyan-300 bg-cyan-400/25 hover:bg-cyan-400/35'
                                : 'border-[var(--panel-border)] bg-slate-950/82 hover:border-[var(--panel-border-glow)]'
                          }`}
                          title={linkingFrom ? '点击作为连线目标（按住 Alt 可清空输入连接）' : '输入端口（按住 Alt 可清空输入连接）'}
                        />
                      )}

                      {node.type === 'condition' && node.id !== END_NODE_ID && (
                        <div className="absolute -right-7 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
                          {(['true', 'false'] as const).map(handle => {
                            const isActive = linkingFrom?.nodeId === node.id && linkingFrom.sourceHandle === handle;
                            return (
                              <button
                                key={handle}
                                data-node-port="true"
                                onPointerDown={event => {
                                  event.stopPropagation();
                                  const point = toCanvasPoint(event.clientX, event.clientY);
                                  setDraftLink({
                                    sourceNodeId: node.id,
                                    sourceHandle: handle,
                                    x: point.x,
                                    y: point.y,
                                  });
                                  setLinkingFrom({ nodeId: node.id, sourceHandle: handle });
                                  setReconnectingEdge(null);
                                  setSelectedEdgeId(null);
                                  dragPointerRef.current = { x: event.clientX, y: event.clientY };
                                  setBodyInteraction({ cursor: 'crosshair', lockSelection: true });
                                }}
                                onClick={event => {
                                  event.stopPropagation();
                                  setDraftLink(null);
                                  setLinkingFrom(prev => (
                                    prev?.nodeId === node.id && prev?.sourceHandle === handle
                                      ? null
                                      : { nodeId: node.id, sourceHandle: handle }
                                  ));
                                  setReconnectingEdge(null);
                                  setSelectedEdgeId(null);
                                  setSelectedNodeId(node.id);
                                  setSelectedNodeIds([node.id]);
                                }}
                                className={`relative h-6 w-6 rounded-full border transition-colors ${
                                  isActive
                                    ? handle === 'true'
                                      ? 'border-emerald-300 bg-emerald-400/35'
                                      : 'border-rose-300 bg-rose-400/35'
                                    : 'border-[var(--panel-border)] bg-slate-950/82 hover:border-[var(--panel-border-glow)]'
                                }`}
                                title={handle === 'true' ? 'True 分支输出端口' : 'False 分支输出端口'}
                              >
                                <span className="absolute -right-6 top-1/2 -translate-y-1/2 text-[10px] text-white/45">
                                  {handle === 'true' ? 'T' : 'F'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {node.id !== END_NODE_ID && node.type !== 'condition' && (
                        <button
                          data-node-port="true"
                          onPointerDown={event => {
                            event.stopPropagation();
                            const point = toCanvasPoint(event.clientX, event.clientY);
                            setDraftLink({
                              sourceNodeId: node.id,
                              sourceHandle: undefined,
                              x: point.x,
                              y: point.y,
                            });
                            setLinkingFrom({ nodeId: node.id });
                            setReconnectingEdge(null);
                            setSelectedEdgeId(null);
                            dragPointerRef.current = { x: event.clientX, y: event.clientY };
                            setBodyInteraction({ cursor: 'crosshair', lockSelection: true });
                          }}
                          onClick={event => {
                            event.stopPropagation();
                            setDraftLink(null);
                            setLinkingFrom(prev => (prev?.nodeId === node.id && !prev.sourceHandle ? null : { nodeId: node.id }));
                            setReconnectingEdge(null);
                            setSelectedEdgeId(null);
                            setSelectedNodeId(node.id);
                            setSelectedNodeIds([node.id]);
                          }}
                          className={`absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border transition-colors ${
                            linkingFrom?.nodeId === node.id && !linkingFrom.sourceHandle
                              ? 'border-violet-300 bg-violet-400/35'
                              : 'border-[var(--panel-border)] bg-slate-950/82 hover:border-[var(--panel-border-glow)]'
                          }`}
                          title={linkingFrom?.nodeId === node.id && !linkingFrom.sourceHandle ? '再次点击取消连线起点' : '输出端口：点击后再点目标节点输入端'}
                        />
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {nodeIcon(node.type)}
                          <div className="truncate text-sm font-semibold text-white">{node.label}</div>
                        </div>
                        {node.id !== START_NODE_ID && node.id !== END_NODE_ID && (
                          <UIButton
                            tone="ghost"
                            size="icon"
                            onClick={event => {
                              event.stopPropagation();
                              removeNode(node.id);
                            }}
                            className="h-6 w-6 rounded-full border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/35 hover:text-red-300"
                          >
                            <X size={13} />
                          </UIButton>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] leading-5 text-white/52">
                        {node.type === 'start' && '输入变量进入工作流'}
                        {node.type === 'end' && '输出最终结果'}
                        {node.type === 'llm' && '调用当前 API 设置的大模型'}
                        {node.type === 'knowledge' && '从知识库检索上下文'}
                        {node.type === 'prompt' && '拼接 Prompt 模板'}
                        {node.type === 'skill' && '注入 Skill 边界'}
                        {node.type === 'condition' && '按 true / false 条件分支流转'}
                        {node.type === 'parallel' && '聚合多个结果'}
                        {node.type === 'document' && '写入文档'}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/35">
                        <span className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2 py-0.5">{node.type}</span>
                        {linkingFrom && node.id !== START_NODE_ID && linkingFrom.nodeId !== node.id && (
                          <span className="rounded-full border border-cyan-300/18 bg-cyan-500/20 px-2 py-0.5 text-cyan-200">
                            可连接目标
                          </span>
                        )}
                        {typeof node.config.inputNode === 'string' && node.config.inputNode && (
                          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2 py-0.5">
                            来源 {selectedWorkflow.nodes.find(item => item.id === node.config.inputNode)?.label || String(node.config.inputNode).slice(0, 6)}
                          </span>
                        )}
                        {node.type === 'condition' && typeof node.config.trueNodeId === 'string' && node.config.trueNodeId && (
                          <span className="rounded-full border border-emerald-300/15 bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
                            True → {selectedWorkflow.nodes.find(item => item.id === node.config.trueNodeId)?.label || String(node.config.trueNodeId).slice(0, 6)}
                          </span>
                        )}
                        {node.type === 'condition' && typeof node.config.falseNodeId === 'string' && node.config.falseNodeId && (
                          <span className="rounded-full border border-rose-300/15 bg-rose-500/20 px-2 py-0.5 text-rose-200">
                            False → {selectedWorkflow.nodes.find(item => item.id === node.config.falseNodeId)?.label || String(node.config.falseNodeId).slice(0, 6)}
                          </span>
                        )}
                      </div>
                      </div>
                    );
                  })}

                  {edgeInsertMenu && (
                    <div
                      data-edge-insert-menu="true"
                      className="absolute z-30 w-48 rounded-2xl border border-[var(--panel-border)] bg-[rgba(8,13,24,0.95)] p-2 shadow-2xl backdrop-blur-xl"
                      style={{
                        left: edgeInsertMenu.x + 12,
                        top: edgeInsertMenu.y + 12,
                      }}
                    >
                      <div className="px-2 py-1 text-[10px] tracking-[0.14em] text-white/40">在连线上插入节点</div>
                      <div className="mt-1 max-h-56 space-y-1 overflow-y-auto pr-1">
                        {NODE_LIBRARY.map(item => (
                          <button
                            key={`edge-insert-${item.type}`}
                            onClick={event => {
                              event.stopPropagation();
                              addNodeBetweenEdge(item.type, edgeInsertMenu);
                            }}
                            className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.08]"
                          >
                            <div className="flex items-center gap-2">
                              {nodeIcon(item.type)}
                              <span className="truncate text-[12px] font-medium text-white">{item.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={event => {
                          event.stopPropagation();
                          setEdgeInsertMenu(null);
                        }}
                        className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2 py-1.5 text-[11px] text-white/70 hover:bg-white/[0.08]"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {showNodeConfig && (
                <div className="w-[20rem] shrink-0 overflow-y-auto border-l border-[var(--panel-border)] bg-[linear-gradient(180deg,rgba(14,20,32,0.95),rgba(10,14,24,0.99))] p-4">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <UISectionKicker className="tracking-[0.22em] text-white/30">节点配置</UISectionKicker>
                      <div className="mt-1 text-[1.55rem] font-semibold tracking-tight text-white">{selectedNode.label}</div>
                    </div>

                    <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[12px] font-medium text-white/84">节点摘要</div>
                          <div className="mt-1 text-[11px] text-white/42">类型、连接和当前状态</div>
                        </div>
                        <span className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/52">
                          {selectedNode.type}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">输入</div>
                          <div className="mt-1 text-sm font-medium text-white">
                            {selectedNode.id === START_NODE_ID
                              ? '入口'
                              : typeof selectedNode.config.inputNode === 'string' && selectedNode.config.inputNode
                                ? selectedWorkflow.nodes.find(item => item.id === selectedNode.config.inputNode)?.label || '已连接'
                                : '自动'}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">输出</div>
                          <div className="mt-1 text-sm font-medium text-white">
                            {selectedNode.id === END_NODE_ID
                              ? '终点'
                              : buildEdges(selectedWorkflow.nodes).filter(edge => edge.source === selectedNode.id).length || '未连线'}
                          </div>
                        </div>
                      </div>
                    </UIPanel>

                    <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                      <div className="mb-3">
                        <div className="text-[12px] font-medium text-white/84">基础设置</div>
                        <div className="mt-1 text-[11px] text-white/42">调整节点标题和输入来源</div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">标题</label>
                          <UIInput
                            value={selectedNode.label}
                            onChange={event => updateNode(selectedNode.id, { label: event.target.value })}
                          />
                        </div>

                        {!['start', 'parallel', 'end'].includes(selectedNode.type) && (
                          <div>
                            <label className="mb-2 block text-[11px] text-white/45">输入来源</label>
                            <select
                              value={String(selectedNode.config.inputNode || '')}
                              onChange={event => updateNodeConfig(selectedNode.id, { inputNode: event.target.value })}
                              className="h-10 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 text-sm text-white outline-none focus:border-[var(--panel-border-glow)]"
                            >
                              <option value="">自动连接</option>
                              {upstreamCandidates.map(node => (
                                <option key={node.id} value={node.id}>{node.label}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </UIPanel>

                    {selectedNode.type === 'llm' && (
                      <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                        <div className="mb-3">
                          <div className="text-[12px] font-medium text-white/84">模型提示</div>
                          <div className="mt-1 text-[11px] text-white/42">配置主提示词和 system 提示词</div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">Prompt</label>
                          <UITextarea
                            value={String(selectedNode.config.prompt || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { prompt: event.target.value })}
                            rows={6}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">System Prompt</label>
                          <UITextarea
                            value={String(selectedNode.config.systemPrompt || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { systemPrompt: event.target.value })}
                            rows={4}
                            className="text-xs"
                          />
                        </div>
                      </UIPanel>
                    )}

                    {selectedNode.type === 'knowledge' && (
                      <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                        <div className="mb-3">
                          <div className="text-[12px] font-medium text-white/84">检索设置</div>
                          <div className="mt-1 text-[11px] text-white/42">指定查询模板与目标集合</div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">查询模板</label>
                          <UIInput
                            value={String(selectedNode.config.query || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { query: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">集合名称</label>
                          <UIInput
                            value={String(selectedNode.config.collection || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { collection: event.target.value })}
                          />
                        </div>
                      </UIPanel>
                    )}

                    {selectedNode.type === 'prompt' && (
                      <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                        <div className="mb-3">
                          <div className="text-[12px] font-medium text-white/84">Prompt 设置</div>
                          <div className="mt-1 text-[11px] text-white/42">选择模板或写内联内容</div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">Prompt 模板</label>
                          <select
                            value={String(selectedNode.config.promptId || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { promptId: event.target.value })}
                            className="h-10 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 text-sm text-white outline-none focus:border-[var(--panel-border-glow)]"
                          >
                            <option value="">选择模板</option>
                            {prompts.map(prompt => (
                              <option key={prompt.id} value={prompt.id}>{prompt.title}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">内联内容</label>
                          <UITextarea
                            value={String(selectedNode.config.content || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { content: event.target.value })}
                            rows={5}
                            className="text-xs"
                          />
                        </div>
                      </UIPanel>
                    )}

                    {selectedNode.type === 'skill' && (
                      <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                        <div className="mb-3">
                          <div className="text-[12px] font-medium text-white/84">Skill 设置</div>
                          <div className="mt-1 text-[11px] text-white/42">为节点挂接能力和执行说明</div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">Skill</label>
                          <select
                            value={String(selectedNode.config.skillId || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { skillId: event.target.value })}
                            className="h-10 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 text-sm text-white outline-none focus:border-[var(--panel-border-glow)]"
                          >
                            <option value="">选择 Skill</option>
                            {skills.map(skill => (
                              <option key={skill.id} value={skill.id}>{skill.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">说明</label>
                          <UITextarea
                            value={String(selectedNode.config.instructions || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { instructions: event.target.value })}
                            rows={5}
                            className="text-xs"
                          />
                        </div>
                      </UIPanel>
                    )}

                    {selectedNode.type === 'condition' && (
                      <UIPanel className="space-y-3 rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                        <div className="mb-1">
                          <div className="text-[12px] font-medium text-white/84">条件分支</div>
                          <div className="mt-1 text-[11px] text-white/42">配置表达式与 true / false 出口</div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">条件表达式</label>
                          <UITextarea
                            value={String(selectedNode.config.condition || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { condition: event.target.value })}
                            rows={4}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">True 分支目标</label>
                          <select
                            value={String(selectedNode.config.trueNodeId || '')}
                            onChange={event => connectNodes(selectedNode.id, event.target.value, 'true')}
                            className="h-10 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 text-sm text-white outline-none focus:border-[var(--panel-border-glow)]"
                          >
                            <option value="">未连接</option>
                            {upstreamCandidates
                              .filter(node => node.id !== selectedNode.id && node.id !== START_NODE_ID)
                              .map(node => (
                                <option key={`cond-true-${node.id}`} value={node.id}>{node.label}</option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">False 分支目标</label>
                          <select
                            value={String(selectedNode.config.falseNodeId || '')}
                            onChange={event => connectNodes(selectedNode.id, event.target.value, 'false')}
                            className="h-10 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-3 text-sm text-white outline-none focus:border-[var(--panel-border-glow)]"
                          >
                            <option value="">未连接</option>
                            {upstreamCandidates
                              .filter(node => node.id !== selectedNode.id && node.id !== START_NODE_ID)
                              .map(node => (
                                <option key={`cond-false-${node.id}`} value={node.id}>{node.label}</option>
                              ))}
                          </select>
                        </div>
                      </UIPanel>
                    )}

                    {selectedNode.type === 'parallel' && (
                      <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                        <div className="mb-3">
                          <div className="text-[12px] font-medium text-white/84">聚合设置</div>
                          <div className="mt-1 text-[11px] text-white/42">逗号分隔多个来源节点 id</div>
                        </div>
                        <label className="mb-2 block text-[11px] text-white/45">聚合节点</label>
                        <UITextarea
                          value={Array.isArray(selectedNode.config.sourceNodeIds) ? (selectedNode.config.sourceNodeIds as string[]).join(', ') : ''}
                          onChange={event => updateNodeConfig(selectedNode.id, {
                            sourceNodeIds: event.target.value.split(',').map(item => item.trim()).filter(Boolean),
                          })}
                          rows={4}
                          className="text-xs"
                        />
                      </UIPanel>
                    )}

                    {selectedNode.type === 'document' && (
                      <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4">
                        <div className="mb-3">
                          <div className="text-[12px] font-medium text-white/84">输出设置</div>
                          <div className="mt-1 text-[11px] text-white/42">控制输出路径和写入模板</div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">输出路径</label>
                          <UIInput
                            value={String(selectedNode.config.outputPath || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { outputPath: event.target.value })}
                            placeholder="/Users/.../output.md"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[11px] text-white/45">内容模板</label>
                          <UITextarea
                            value={String(selectedNode.config.contentTemplate || '')}
                            onChange={event => updateNodeConfig(selectedNode.id, { contentTemplate: event.target.value })}
                            rows={6}
                            className="text-xs"
                          />
                        </div>
                      </UIPanel>
                    )}

                    <UIPanel className="rounded-[1.45rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/84 p-4 text-[11px] leading-5 text-white/45">
                      <div className="mb-2 text-[12px] font-medium text-white/84">变量速查</div>
                      可用变量：<code>{'{{query}}'}</code>、<code>{'{{result.nodeId}}'}</code>
                    </UIPanel>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/35">选中一个节点开始配置</div>
                )}
                </div>
              )}
            </div>

          {showLibrary && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/42 backdrop-blur-sm">
                <UIPanel className="w-full max-w-[820px] bg-[var(--surface-strong)] px-6 py-5 shadow-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <UISectionKicker className="tracking-[0.22em]">NODE LIBRARY</UISectionKicker>
                      <div className="mt-1 text-xl font-semibold text-white">添加节点</div>
                    </div>
                    <UIButton onClick={() => setShowLibrary(false)} tone="ghost" size="icon">
                      <X size={16} />
                    </UIButton>
                  </div>

                  <div className="relative mt-4">
                    <Search size={14} className="absolute left-3 top-3 text-white/35" />
                    <UIInput
                      value={libraryQuery}
                      onChange={event => setLibraryQuery(event.target.value)}
                      placeholder="搜索节点、能力、输出"
                      className="pl-10"
                    />
                  </div>

                  <div className="mt-5 grid max-h-[440px] grid-cols-2 gap-3 overflow-y-auto pr-1">
                    {libraryItems.map(item => (
                      <UIButton
                        key={item.type}
                        draggable
                        onDragStart={event => {
                          event.dataTransfer.setData('application/easyworkflow-node', item.type);
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => addNode(item.type)}
                        tone="ghost"
                        className="h-auto justify-start rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10"
                      >
                        <div className="w-full">
                          <div className="flex items-center gap-2">
                            {nodeIcon(item.type)}
                            <span className="text-base font-semibold text-white">{item.label}</span>
                          </div>
                          <div className="mt-2 text-[11px] text-white/35">{item.category}</div>
                          <div className="mt-1 text-sm leading-6 text-white/55">{item.description}</div>
                        </div>
                      </UIButton>
                    ))}
                  </div>
                </UIPanel>
            </div>
          )}

          {showDiscardPrompt && selectedWorkflow && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/52 px-6 backdrop-blur-sm">
              <UIPanel className="w-full max-w-[30rem] rounded-[1.8rem] border border-[var(--panel-border)] bg-[linear-gradient(180deg,rgba(14,20,32,0.98),rgba(10,14,24,1))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <UISectionKicker className="tracking-[0.22em] text-white/30">UNSAVED CHANGES</UISectionKicker>
                <div className="mt-2 text-[1.45rem] font-semibold tracking-tight text-white">关闭前要怎么处理当前工作流？</div>
                <p className="mt-2 text-sm leading-7 text-white/46">
                  {isSelectedWorkflowTemporary
                    ? '这个新建工作流还没有真正保存到列表里。保存会正式创建，不保存会直接丢弃。'
                    : '当前工作流有未保存修改。你可以保存后关闭，或直接丢弃本次改动。'}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  <UIButton onClick={() => setShowDiscardPrompt(false)} tone="ghost" size="md" className="border-[var(--panel-border)] bg-[var(--surface-muted)] text-white/72">
                    继续编辑
                  </UIButton>
                  <UIButton
                    onClick={() => discardWorkflowChanges(selectedWorkflow)}
                    tone="ghost"
                    size="md"
                    className="border-red-400/16 bg-red-500/[0.06] text-red-200"
                  >
                    丢弃更改
                  </UIButton>
                  <UIButton
                    onClick={async () => {
                      const persistedId = await saveWorkflow(selectedWorkflow);
                      if (!persistedId) return;
                      closeEditorShell();
                    }}
                    tone="primary"
                    size="md"
                    className="bg-blue-600 text-white hover:bg-blue-500"
                  >
                    保存并关闭
                  </UIButton>
                </div>
              </UIPanel>
            </div>
          )}
        </UIOverlayPage>
      )}
    </UIPageShell>
  );
}
