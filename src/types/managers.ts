// src/types/managers.ts

import type {Node, Edge, Metadata, Graph} from './graph.js';
import type {EdgeUpdate, EdgeFilter, MetadataAddition, MetadataResult, MetadataDeletion} from './operations.js';

/**
 * Base interface for all manager operations
 */
export interface IManagerOperations {
    initialize(): Promise<void>;
}

/**
 * Node manager specific operations
 */
export interface INodeOperations extends IManagerOperations {
    addNodes(nodes: Node[]): Promise<Node[]>;

    updateNodes(nodes: Partial<Node>[]): Promise<Node[]>;

    deleteNodes(nodeNames: string[]): Promise<void>;

    getNodes(nodeNames: string[]): Promise<Node[]>;
}

/**
 * Edge manager specific operations
 */
export interface IEdgeOperations extends IManagerOperations {
    addEdges(edges: Edge[]): Promise<Edge[]>;

    updateEdges(edges: EdgeUpdate[]): Promise<Edge[]>;

    deleteEdges(edges: Edge[]): Promise<void>;

    getEdges(filter?: EdgeFilter): Promise<Edge[]>;
}

/**
 * Metadata manager specific operations
 */
export interface IMetadataOperations extends IManagerOperations {
    addMetadata(metadata: MetadataAddition[]): Promise<MetadataResult[]>;

    deleteMetadata(deletions: MetadataDeletion[]): Promise<void>;

    getMetadata(nodeName: string): Promise<Metadata>;
}

/**
 * Search manager specific operations
 */
export interface ISearchOperations extends IManagerOperations {
    searchNodes(query: string): Promise<Graph>;

    openNodes(names: string[]): Promise<Graph>;
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
 * Interface for the KnowledgeGraphManager
 */
export interface KnowledgeGraphManager {
    // Node operations
    addNodes(nodes: Node[]): Promise<Node[]>;

    updateNodes(nodes: Partial<Node>[]): Promise<Node[]>;

    deleteNodes(nodeNames: string[]): Promise<void>;

    // Edge operations
    addEdges(edges: Edge[]): Promise<Edge[]>;

    updateEdges(edges: Edge[]): Promise<Edge[]>;

    deleteEdges(edges: Edge[]): Promise<void>;

    getEdges(filter?: EdgeFilter): Promise<GetEdgesResult>;

    // Metadata operations
    addMetadata(metadata: MetadataAddition[]): Promise<MetadataResult[]>;

    deleteMetadata(deletions: MetadataDeletion[]): Promise<void>;

    // Search operations
    searchNodes(query: string): Promise<OpenNodesResult>;

    openNodes(names: string[]): Promise<OpenNodesResult>;

    readGraph(): Promise<Graph>;

    // Transaction operations
    beginTransaction(): Promise<void>;

    commit(): Promise<void>;

    rollback(): Promise<void>;

    withTransaction<T>(operation: () => Promise<T>): Promise<T>;

    addRollbackAction(action: () => Promise<void>, description: string): Promise<void>;

    isInTransaction(): boolean;

    getCurrentGraph(): Graph;
}

/**
 * Base interface for all managers with event emitter capabilities
 */
export interface IManager extends IManagerOperations {
    on(eventName: string, listener: (data?: any) => void): () => void;

    emit(eventName: string, data?: any): boolean;
}

/**
 * Node manager specific operations
 */
export interface INodeManager extends IManager {
    addNodes(nodes: Node[]): Promise<Node[]>;

    updateNodes(nodes: Partial<Node>[]): Promise<Node[]>;

    deleteNodes(nodeNames: string[]): Promise<void>;

    getNodes(nodeNames: string[]): Promise<Node[]>;
}

/**
 * Edge manager specific operations
 */
export interface IEdgeManager extends IManager {
    addEdges(edges: Edge[]): Promise<Edge[]>;

    updateEdges(edges: EdgeUpdate[]): Promise<Edge[]>;

    deleteEdges(edges: Edge[]): Promise<void>;

    getEdges(filter?: EdgeFilter): Promise<Edge[]>;
}

/**
 * Metadata manager specific operations
 */
export interface IMetadataManager extends IManager {
    addMetadata(metadata: MetadataAddition[]): Promise<MetadataResult[]>;

    deleteMetadata(deletions: MetadataDeletion[]): Promise<void>;

    getMetadata(nodeName: string): Promise<Metadata>;
}

/**
 * Search manager specific operations
 */
export interface ISearchManager extends IManager {
    searchNodes(query: string): Promise<Graph>;

    openNodes(names: string[]): Promise<Graph>;

    readGraph(): Promise<Graph>;
}

/**
 * Transaction manager specific operations
 */
export interface ITransactionManager extends IManager {
    beginTransaction(): Promise<void>;

    commit(): Promise<void>;

    rollback(): Promise<void>;

    addRollbackAction(action: () => Promise<void>, description: string): Promise<void>;

    isInTransaction(): boolean;

    getCurrentGraph(): Graph;
}

/**
 * Combined type for storage implementations
 */
export interface IStorage {
    loadGraph(): Promise<Graph>;

    saveGraph(graph: Graph): Promise<void>;

    loadEdgesByIds(edgeIds: string[]): Promise<Edge[]>;
}