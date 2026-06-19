import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Network, DataSet } from 'vis-network/standalone'
import type { ConceptNode, ConceptEdge } from './types'
import { CATEGORY_COLORS, DIFFICULTY_SIZES } from './types'

export interface VisGraphRef {
  fit: () => void
  focusNode: (id: string) => void
}

interface VisGraphProps {
  nodes: ConceptNode[]
  edges: ConceptEdge[]
  layout: 'force' | 'hierarchical'
  onNodeClick: (node: ConceptNode | null) => void
  highlightedNodeId?: string | null
}

const VisGraph = forwardRef<VisGraphRef, VisGraphProps>(
  ({ nodes, edges, layout, onNodeClick, highlightedNodeId }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const networkRef = useRef<Network | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodesDataSetRef = useRef<any>(null)

    useImperativeHandle(ref, () => ({
      fit: () => networkRef.current?.fit(),
      focusNode: (id: string) => {
        const network = networkRef.current
        if (network) {
          network.focus(id, { scale: 1.2, animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
          network.selectNodes([id])
        }
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const visNodes = new DataSet(
        nodes.map((n) => ({
          id: n.id,
          label: n.name,
          title: `<b>${n.name}</b><br>${n.description}`,
          color: {
            background: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.other,
            border: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.other,
            highlight: { background: '#ff4d4f', border: '#ff4d4f' },
          },
          size: DIFFICULTY_SIZES[n.difficulty] || DIFFICULTY_SIZES.basic,
          font: { size: 12, color: '#333' },
          category: n.category,
          difficulty: n.difficulty,
        }))
      )

      const visEdges = new DataSet(
        edges.map((e, i) => ({
          id: `${e.from}-${e.to}-${i}`,
          from: e.from,
          to: e.to,
          label: e.label,
          arrows: 'to',
          font: { size: 10, color: '#999', strokeWidth: 0 },
          color: { color: '#ccc', highlight: '#ff4d4f' },
        }))
      )

      nodesDataSetRef.current = visNodes

      const baseOptions = {
        nodes: {
          shape: 'dot',
          borderWidth: 2,
          shadow: { enabled: true, size: 4, x: 0, y: 2 },
        },
        edges: {
          smooth: { enabled: true, type: 'continuous', roundness: 0.3 },
          width: 1.5,
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true,
          multiselect: false,
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -60,
            centralGravity: 0.01,
            springLength: 120,
            springConstant: 0.06,
            damping: 0.4,
          },
          stabilization: { iterations: 200 },
        },
      }

      const hierarchicalOptions = {
        ...baseOptions,
        layout: {
          hierarchical: {
            direction: 'UD',
            sortMethod: 'directed',
            levelSeparation: 120,
            nodeSpacing: 150,
            treeSpacing: 200,
          },
        },
        physics: { enabled: false },
      }

      const options = layout === 'hierarchical' ? hierarchicalOptions : baseOptions

      const network = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options)
      networkRef.current = network

      network.on('click', (params: { nodes: string[] }) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          const found = nodes.find((n) => n.id === nodeId)
          onNodeClick(found || null)
        } else {
          onNodeClick(null)
        }
      })

      network.on('stabilizationProgress', () => {})

      network.once('stabilizationIterationsDone', () => {
        network.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
      })

      return () => {
        network.destroy()
        networkRef.current = null
      }
    }, [nodes, edges, layout])

    useEffect(() => {
      const network = networkRef.current
      if (!network || !highlightedNodeId) return

      network.focus(highlightedNodeId, {
        scale: 1.3,
        animation: { duration: 400, easingFunction: 'easeInOutQuad' },
      })
      network.selectNodes([highlightedNodeId])
    }, [highlightedNodeId])

    return (
      <div
        ref={containerRef}
        className="w-full h-full bg-white rounded-xl"
        style={{ minHeight: 400 }}
      />
    )
  }
)

VisGraph.displayName = 'VisGraph'

export default VisGraph
