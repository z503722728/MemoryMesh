// src/types/graph.ts

/**
 * Represents metadata information associated with a node
 */
export type Metadata = string[];

/**
 * Represents a node in the knowledge graph
 */
export interface Node {
    type: 'node';
    name: string;
    nodeType: string;
    metadata: Metadata;
}

/**
 * Represents an edge connecting two nodes in the knowledge graph
 */
export interface Edge {
    type: 'edge';
    from: string;
    to: string;
    edgeType: string;
}

/**
 * Represents the complete knowledge graph structure
 */
export interface Graph {
    nodes: Node[];
    edges: Edge[];
}