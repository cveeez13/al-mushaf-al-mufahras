import { useEffect, useState } from 'react';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';

type GraphNode = SimulationNodeDatum & {
  id: string;
  label: string;
  kind: 'topic' | 'ayah';
};

type GraphLink = SimulationLinkDatum<GraphNode> & {
  source: string | GraphNode;
  target: string | GraphNode;
};

const TOPICS: GraphNode[] = [
  { id: 't1', label: 'الإيمان', kind: 'topic' },
  { id: 't2', label: 'الصبر', kind: 'topic' },
];

const AYAT: GraphNode[] = [
  { id: 'a1', label: 'آية 1', kind: 'ayah' },
  { id: 'a2', label: 'آية 2', kind: 'ayah' },
  { id: 'a3', label: 'آية 3', kind: 'ayah' },
];

const LINKS: GraphLink[] = [
  { source: 't1', target: 'a1' },
  { source: 't1', target: 'a2' },
  { source: 't2', target: 'a2' },
  { source: 't2', target: 'a3' },
];

const WIDTH = 760;
const HEIGHT = 440;

function getNodeId(node: string | GraphNode) {
  return typeof node === 'string' ? node : node.id;
}

function getNodePosition(node: GraphNode) {
  return {
    x: node.x ?? WIDTH / 2,
    y: node.y ?? HEIGHT / 2,
  };
}

export default function TopicGraphPanel() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  useEffect(() => {
    const nextNodes = [...TOPICS, ...AYAT].map((node) => ({ ...node }));
    const nextLinks = LINKS.map((link) => ({ ...link }));

    const simulation = forceSimulation(nextNodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(nextLinks)
          .id((node) => node.id)
          .distance(120)
      )
      .force('charge', forceManyBody().strength(-260))
      .force('center', forceCenter(WIDTH / 2, HEIGHT / 2));

    simulation.tick(120);
    simulation.stop();

    setNodes([...nextNodes]);
    setLinks([...nextLinks]);

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[var(--color-mushaf-gold)]/20 bg-white/70 p-4">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto min-w-[640px] w-full"
        role="img"
        aria-label="خريطة تربط بين المواضيع والآيات"
      >
        <g>
          {links.map((link, index) => {
            const sourceNode = nodes.find((node) => node.id === getNodeId(link.source));
            const targetNode = nodes.find((node) => node.id === getNodeId(link.target));

            if (!sourceNode || !targetNode) {
              return null;
            }

            const source = getNodePosition(sourceNode);
            const target = getNodePosition(targetNode);

            return (
              <line
                key={`${getNodeId(link.source)}-${getNodeId(link.target)}-${index}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#b4b4b4"
                strokeWidth={2}
                opacity={0.9}
              />
            );
          })}
        </g>

        <g>
          {nodes.map((node) => {
            const { x, y } = getNodePosition(node);
            const isTopic = node.kind === 'topic';

            return (
              <g key={node.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={isTopic ? 20 : 12}
                  fill={isTopic ? '#f9c846' : '#4fa3f7'}
                  stroke={isTopic ? '#8f6b00' : '#1b5e9a'}
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={y + (isTopic ? 34 : 28)}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#2b2b2b"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
