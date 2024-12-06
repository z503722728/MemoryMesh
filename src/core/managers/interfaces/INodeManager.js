// src/managers/interfaces/INodeManager.js
import {IManager} from './IManager.js';

/**
 * @class INodeManager
 * @extends IManager
 * @classdesc Interface for node-related operations in the knowledge graph. Defines the contract for managing nodes, including adding, updating, deleting, and retrieving nodes.
 */
export class INodeManager extends IManager {
    /**
     * Adds new nodes to the knowledge graph.
     *
     * @param {Array<Object>} nodes - Array of node objects to add. Each node should have at least a `name` and `nodeType`.
     * @returns {Promise<Array<Object>>} - Promise resolving to an array of newly added nodes.
     * @throws {Error} Method not implemented.
     */
    async addNodes(nodes) {
        throw new Error('Method not implemented');
    }

    /**
     * Updates existing nodes in the knowledge graph.
     *
     * @param {Array<Object>} nodes - Array of node objects with updates. Each node must have a `name` to identify it.
     * @returns {Promise<Array<Object>>} - Promise resolving to an array of updated nodes.
     * @throws {Error} Method not implemented.
     */
    async updateNodes(nodes) {
        throw new Error('Method not implemented');
    }

    /**
     * Deletes nodes from the knowledge graph.
     *
     * @param {Array<string>} nodeNames - Array of node names to delete.
     * @returns {Promise<void>} - Promise resolving when deletion is complete.
     * @throws {Error} Method not implemented.
     */
    async deleteNodes(nodeNames) {
        throw new Error('Method not implemented');
    }

    /**
     * Retrieves specific nodes from the knowledge graph by their names.
     *
     * @param {Array<string>} nodeNames - Array of node names to retrieve.
     * @returns {Promise<Array<Object>>} - Promise resolving to an array of nodes matching the provided names.
     * @throws {Error} Method not implemented.
     */
    async getNodes(nodeNames) {
        throw new Error('Method not implemented');
    }
}
