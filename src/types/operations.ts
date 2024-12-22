// src/types/operations.ts
import type {Node, Edge, Graph, Metadata} from './graph.js';

/**
 * Edge update operation parameters
 */
export interface EdgeUpdate {
    from: string;
    to: string;
    edgeType: string;
    newFrom?: string;
    newTo?: string;
    newEdgeType?: string;
}

/**
 * Edge filter parameters
 */
export interface EdgeFilter {
    from?: string;
    to?: string;
    edgeType?: string;
}

/**
 * Metadata addition parameters
 */
export interface MetadataAddition {
    nodeName: string;
    contents: string[];
}

/**
 * Metadata deletion parameters
 */
export interface MetadataDeletion {
    nodeName: string;
    metadata: string[];
}

/**
 * Result of metadata operation
 */
export interface MetadataResult {
    nodeName: string;
    addedMetadata: string[];
}

/**
 * Result of opening nodes
 */
export interface OpenNodesResult {
    nodes: Node[];
    edges: Edge[];
}

/**
 * Result of getting edges
 */
export interface GetEdgesResult {
    edges: Edge[];
}

/**
 * Interface for graph operations
 */
export interface IGraphOperations {
    addNodes(nodes: Node[]): Promise<Node[]>;

    updateNodes(nodes: Partial<Node>[]): Promise<Node[]>;

    deleteNodes(nodeNames: string[]): Promise<void>;

    addEdges(edges: Edge[]): Promise<Edge[]>;

    updateEdges(edges: Edge[]): Promise<Edge[]>;

    deleteEdges(edges: Edge[]): Promise<void>;

    getEdges(filter?: EdgeFilter): Promise<GetEdgesResult>;

    addMetadata(metadata: MetadataAddition[]): Promise<MetadataResult[]>;

    deleteMetadata(deletions: MetadataDeletion[]): Promise<void>;
}

/**
 * Interface for search operations
 */
export interface ISearchOperations {
    searchNodes(query: string): Promise<OpenNodesResult>;

    openNodes(names: string[]): Promise<OpenNodesResult>;
}

/**
 * Interface for transaction operations
 */
export interface ITransactionOperations {
    beginTransaction(): Promise<void>;

    commit(): Promise<void>;

    rollback(): Promise<void>;

    withTransaction<T>(operation: () => Promise<T>): Promise<T>;

    addRollbackAction(action: () => Promise<void>, description: string): Promise<void>;

    isInTransaction(): boolean;

    getCurrentGraph(): Graph;
}