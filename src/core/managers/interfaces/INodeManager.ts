// src/core/managers/interfaces/INodeManager.ts

import {IManager} from './IManager.js';
import type {Node} from '../../../types/graph.js';

/**
 * Interface for node-related operations in the knowledge graph.
 * Defines the contract for managing nodes, including adding, updating, deleting, and retrieving nodes.
 */
export abstract class INodeManager extends IManager {
    /**
     * Adds new nodes to the knowledge graph.
     */
    abstract addNodes(nodes: Node[]): Promise<Node[]>;

    /**
     * Updates existing nodes in the knowledge graph.
     */
    abstract updateNodes(nodes: Partial<Node>[]): Promise<Node[]>;

    /**
     * Deletes nodes from the knowledge graph.
     */
    abstract deleteNodes(nodeNames: string[]): Promise<void>;

    /**
     * Retrieves specific nodes from the knowledge graph by their names.
     */
    abstract getNodes(nodeNames: string[]): Promise<Node[]>;
}