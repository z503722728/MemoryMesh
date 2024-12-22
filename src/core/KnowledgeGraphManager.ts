// src/core/KnowledgeGraphManager.ts

import {JsonLineStorage} from './storage/JsonLineStorage.js';
import {ManagerFactory} from './managers/ManagerFactory.js';
import {GraphOperations} from './operations/index.js';
import {SearchOperations} from './operations/index.js';
import {TransactionOperations} from './operations/index.js';
import type {Node, Edge, Graph} from '../types/graph.js';
import type {
    MetadataAddition,
    MetadataDeletion,
    EdgeFilter,
    MetadataResult,
    GetEdgesResult,
    OpenNodesResult
} from '../types/index.js';
import type {IStorage} from '../types/storage.js';

/**
 * Manages operations related to the knowledge graph by coordinating between
 * specialized operation classes for graph manipulation, search, and transactions.
 */
export class KnowledgeGraphManager {
    private readonly graphOperations: GraphOperations;
    private readonly searchOperations: SearchOperations;
    private readonly transactionOperations: TransactionOperations;

    /**
     * Creates an instance of KnowledgeGraphManager.
     */
    constructor(storage: IStorage = new JsonLineStorage()) {
        const nodeManager = ManagerFactory.createNodeManager(storage);
        const edgeManager = ManagerFactory.createEdgeManager(storage);
        const metadataManager = ManagerFactory.createMetadataManager(storage);
        const searchManager = ManagerFactory.createSearchManager(storage);
        const transactionManager = ManagerFactory.createTransactionManager(storage);

        this.graphOperations = new GraphOperations(nodeManager, edgeManager, metadataManager);
        this.searchOperations = new SearchOperations(searchManager);
        this.transactionOperations = new TransactionOperations(transactionManager);
    }

    /**
     * Transaction Operations
     */

    async beginTransaction(): Promise<void> {
        return this.transactionOperations.beginTransaction();
    }

    async commit(): Promise<void> {
        return this.transactionOperations.commit();
    }

    async rollback(): Promise<void> {
        return this.transactionOperations.rollback();
    }

    /**
     * Executes an operation within a transaction and handles commit/rollback.
     */
    async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
        return this.transactionOperations.withTransaction(operation);
    }

    /**
     * Adds a rollback action to the current transaction.
     */
    async addRollbackAction(action: () => Promise<void>, description: string): Promise<void> {
        return this.transactionOperations.addRollbackAction(action, description);
    }

    isInTransaction(): boolean {
        return this.transactionOperations.isInTransaction();
    }

    getCurrentGraph(): Graph {
        return this.transactionOperations.getCurrentGraph();
    }

    /**
     * Graph Operations - Nodes
     */

    async addNodes(nodes: Node[]): Promise<Node[]> {
        return this.graphOperations.addNodes(nodes);
    }


    async updateNodes(nodes: Partial<Node>[]): Promise<Node[]> {
        return this.graphOperations.updateNodes(nodes);
    }

    async deleteNodes(nodeNames: string[]): Promise<void> {
        return this.graphOperations.deleteNodes(nodeNames);
    }

    /**
     * Graph Operations - Edges
     */

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

    /**
     * Graph Operations - Metadata
     */

    async addMetadata(metadata: MetadataAddition[]): Promise<MetadataResult[]> {
        return this.graphOperations.addMetadata(metadata);
    }

    async deleteMetadata(deletions: MetadataDeletion[]): Promise<void> {
        return this.graphOperations.deleteMetadata(deletions);
    }

    /**
     * Search Operations
     */

    async readGraph(): Promise<Graph> {
        return await this.searchOperations.readGraph();
    }

    async searchNodes(query: string): Promise<OpenNodesResult> {
        return this.searchOperations.searchNodes(query);
    }

    async openNodes(names: string[]): Promise<OpenNodesResult> {
        return this.searchOperations.openNodes(names);
    }
}