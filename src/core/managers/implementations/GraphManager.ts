// src/core/GraphManager.ts

import {KnowledgeGraphManagerBase} from '../../KnowledgeGraphManagerBase.js';
import {GraphOperations} from '../../operations/index.js';
import type {Node, Edge} from '../../../types/graph.js';
import type {
    MetadataAddition,
    MetadataDeletion,
    EdgeFilter,
    MetadataResult,
    GetEdgesResult, IStorage
} from '../../../types/index.js';

/**
 * Handles graph-specific operations (nodes, edges, metadata)
 */
export class GraphManager extends KnowledgeGraphManagerBase {
    private readonly graphOperations: GraphOperations;

    constructor(storage?: IStorage) {
        super(storage);
        const {nodeManager, edgeManager, metadataManager} = this.createManagers();
        this.graphOperations = new GraphOperations(nodeManager, edgeManager, metadataManager);
    }

    // Node operations
    async addNodes(nodes: Node[]): Promise<Node[]> {
        return this.graphOperations.addNodes(nodes);
    }

    async updateNodes(nodes: Partial<Node>[]): Promise<Node[]> {
        return this.graphOperations.updateNodes(nodes);
    }

    async deleteNodes(nodeNames: string[]): Promise<void> {
        return this.graphOperations.deleteNodes(nodeNames);
    }

    // Edge operations
    async addEdges(edges: Edge[]): Promise<Edge[]> {
        return this.graphOperations.addEdges(edges);
    }

    async updateEdges(edges: Edge[]): Promise<Edge[]> {
        return this.graphOperations.updateEdges(edges);
    }

    async deleteEdges(edges: Edge[]): Promise<void> {
        return this.graphOperations.deleteEdges(edges);
    }

    async getEdges(filter?: EdgeFilter): Promise<GetEdgesResult> {
        return this.graphOperations.getEdges(filter);
    }

    // Metadata operations
    async addMetadata(metadata: MetadataAddition[]): Promise<MetadataResult[]> {
        return this.graphOperations.addMetadata(metadata);
    }

    async deleteMetadata(deletions: MetadataDeletion[]): Promise<void> {
        return this.graphOperations.deleteMetadata(deletions);
    }
}