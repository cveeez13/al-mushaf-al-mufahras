'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force';
import { TOPICS } from '@/lib/types';
import { getTopicsMaster } from '@/lib/data';
import { useI18n } from '@/lib/i18n';

interface TopicNode extends SimulationNodeDatum {
  id: number;
  color: string;
  hex: string;
  verseCount: number;
  radius: number;
  label: string;
}

interface TopicLink extends SimulationLinkDatum<TopicNode> {
  weight: number; // co-occurrence count (pages where both topics appear)
}

interface TopicGraphProps {
  onTopicClick: (color: string) => void;
}

/**
 * Compute topic co-occurrence: how many pages have both topic A and topic B.
 */
async function computeCoOccurrence(): Promise<{ nodes: TopicNode[]; links: TopicLink[]; topicVerseCounts: Map<number, number> }> {
  const data = await getTopicsMaster();

  // Count verses per topic
  const verseCounts = new Map<number, number>();
  // Group topics per page
  const pageTopics = new Map<number, Set<number>>();

  for (const v of data.verses) {
    verseCounts.set(v.topic.id, (verseCounts.get(v.topic.id) || 0) + 1);
    if (v.page) {
      if (!pageTopics.has(v.page)) pageTopics.set(v.page, new Set());
      pageTopics.get(v.page)!.add(v.topic.id);
    }
  }

  // Count co-occurrences
  const coOccurrence = new Map<string, number>();
  for (const [, topics] of pageTopics) {
    const arr = Array.from(topics);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = `${Math.min(arr[i], arr[j])}-${Math.max(arr[i], arr[j])}`;
        coOccurrence.set(key, (coOccurrence.get(key) || 0) + 1);
      }
    }
  }

  // Build nodes
  const maxVerses = Math.max(...verseCounts.values());
  const nodes: TopicNode[] = Object.values(TOPICS).map(t => ({
    id: t.id,
    color: t.color,
    hex: t.hex,
    verseCount: verseCounts.get(t.id) || 0,
    radius: 25 + ((verseCounts.get(t.id) || 0) / maxVerses) * 45, // 25-70px
    label: t.name_ar,
  }));

  // Build links (only co-occurrences above threshold)
  const links: TopicLink[] = [];
  for (const [key, weight] of coOccurrence) {
    const [a, b] = key.split('-').map(Number);
    if (weight > 10) { // Filter weak connections
      links.push({
        source: nodes.find(n => n.id === a)!,
        target: nodes.find(n => n.id === b)!,
        weight,
      });
    }
  }

  return { nodes, links, topicVerseCounts: verseCounts };
}

export default function TopicGraph({ onTopicClick }: TopicGraphProps) {
  const { lang, topicName } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<TopicNode[]>([]);
  const linksRef = useRef<TopicLink[]>([]);
  const simRef = useRef<ReturnType<typeof forceSimulation<TopicNode>> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TopicNode | null>(null);
  const [dimensions, setDimensions] = useState({ w: 600, h: 500 });
  const [ready, setReady] = useState(false);
  const dragRef = useRef<{ node: TopicNode; offsetX: number; offsetY: number } | null>(null);
  const animFrameRef = useRef<number>(0);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ w: width, h: Math.max(height, 400) });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Load data and start simulation
  useEffect(() => {
    let cancelled = false;
    computeCoOccurrence().then(({ nodes, links }) => {
      if (cancelled) return;
      nodesRef.current = nodes;
      linksRef.current = links;

      const maxWeight = Math.max(...links.map(l => l.weight), 1);

      const sim = forceSimulation<TopicNode>(nodes)
        .force('link', forceLink<TopicNode, TopicLink>(links)
          .id(d => d.id)
          .distance(d => 180 - (d.weight / maxWeight) * 80) // stronger link = closer
          .strength(d => 0.3 + (d.weight / maxWeight) * 0.5)
        )
        .force('charge', forceManyBody<TopicNode>().strength(-400))
        .force('center', forceCenter(dimensions.w / 2, dimensions.h / 2))
        .force('collide', forceCollide<TopicNode>(d => d.radius + 8))
        .alphaDecay(0.02)
        .on('tick', () => { /* render in RAF loop */ });

      simRef.current = sim;
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update center force when dimensions change
  useEffect(() => {
    if (simRef.current) {
      simRef.current.force('center', forceCenter(dimensions.w / 2, dimensions.h / 2));
      simRef.current.alpha(0.3).restart();
    }
  }, [dimensions]);

  // Canvas render loop
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const render = () => {
      const { w, h } = dimensions;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const maxWeight = Math.max(...links.map(l => l.weight), 1);

      // Draw links
      for (const link of links) {
        const source = link.source as TopicNode;
        const target = link.target as TopicNode;
        if (!source.x || !source.y || !target.x || !target.y) continue;

        const normalizedWeight = link.weight / maxWeight;
        const lineWidth = 1 + normalizedWeight * 5;
        const alpha = 0.15 + normalizedWeight * 0.35;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(201, 169, 110, ${alpha})`; // mushaf-gold
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Edge label (co-occurrence count) at midpoint
        if (normalizedWeight > 0.3) {
          const mx = (source.x + target.x) / 2;
          const my = (source.y + target.y) / 2;
          ctx.font = '10px system-ui';
          ctx.fillStyle = 'rgba(201, 169, 110, 0.6)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${link.weight}`, mx, my);
        }
      }

      // Draw nodes
      for (const node of nodes) {
        if (!node.x || !node.y) continue;
        const isHovered = hoveredNode?.id === node.id;

        // Glow effect on hover
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = `${node.hex}22`;
          ctx.fill();
        }

        // Main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        // Gradient fill
        const grad = ctx.createRadialGradient(
          node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
          node.x, node.y, node.radius
        );
        grad.addColorStop(0, lighten(node.hex, 30));
        grad.addColorStop(1, node.hex);
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        ctx.strokeStyle = isHovered ? '#C9A96E' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.stroke();

        // Verse count inside circle
        ctx.font = `bold ${Math.max(12, node.radius * 0.35)}px system-ui`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${node.verseCount}`, node.x, node.y);

        // Label below
        const label = topicName(node.id);
        const displayLabel = label.length > 25 ? label.slice(0, 22) + '…' : label;
        ctx.font = `${Math.max(10, node.radius * 0.22)}px "IBM Plex Sans Arabic", system-ui`;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-mushaf-text').trim() || '#2C1810';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(displayLabel, node.x, node.y + node.radius + 6);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [ready, dimensions, hoveredNode, topicName]);

  // Hit test
  const getNodeAt = useCallback((cx: number, cy: number): TopicNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (!n.x || !n.y) continue;
      const dx = cx - n.x;
      const dy = cy - n.y;
      if (dx * dx + dy * dy <= n.radius * n.radius) return n;
    }
    return null;
  }, []);

  const getCanvasCoords = (e: React.MouseEvent | React.Touch): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);

    if (dragRef.current) {
      const { node } = dragRef.current;
      node.fx = x;
      node.fy = y;
      simRef.current?.alpha(0.1).restart();
      return;
    }

    const hit = getNodeAt(x, y);
    setHoveredNode(hit);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hit ? 'pointer' : 'default';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    const hit = getNodeAt(x, y);
    if (hit) {
      dragRef.current = { node: hit, offsetX: 0, offsetY: 0 };
      hit.fx = x;
      hit.fy = y;
      simRef.current?.alphaTarget(0.1).restart();
    }
  };

  const handleMouseUp = () => {
    if (dragRef.current) {
      dragRef.current.node.fx = null;
      dragRef.current.node.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragRef.current) return; // was dragging
    const { x, y } = getCanvasCoords(e);
    const hit = getNodeAt(x, y);
    if (hit) {
      onTopicClick(hit.color);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const { x, y } = getCanvasCoords(e.touches[0]);
    const hit = getNodeAt(x, y);
    if (hit) {
      e.preventDefault();
      dragRef.current = { node: hit, offsetX: 0, offsetY: 0 };
      hit.fx = x;
      hit.fy = y;
      simRef.current?.alphaTarget(0.1).restart();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e.touches[0]);
    dragRef.current.node.fx = x;
    dragRef.current.node.fy = y;
  };

  const handleTouchEnd = () => {
    if (dragRef.current) {
      dragRef.current.node.fx = null;
      dragRef.current.node.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Tooltip */}
      {hoveredNode && hoveredNode.x && hoveredNode.y && (
        <div
          className="absolute pointer-events-none z-10 px-3 py-2 bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl shadow-lg text-sm max-w-[200px]"
          style={{
            left: hoveredNode.x,
            top: (hoveredNode.y || 0) - hoveredNode.radius - 50,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold font-[var(--font-arabic)] text-xs" style={{ color: hoveredNode.hex }}>
            {topicName(hoveredNode.id)}
          </div>
          <div className="text-[10px] text-[var(--color-mushaf-text)]/50 mt-0.5">
            {hoveredNode.verseCount} {lang === 'ar' ? 'آية' : 'verses'} · {lang === 'ar' ? 'اضغط للتصفية' : 'Click to filter'}
          </div>
        </div>
      )}

      {/* Legend hint */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-[var(--color-mushaf-gold)]">
            {lang === 'ar' ? 'جارٍ بناء الخريطة...' : 'Building graph...'}
          </div>
        </div>
      )}
    </div>
  );
}

/** Lighten a hex color by a percentage */
function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
  return `rgb(${r},${g},${b})`;
}
