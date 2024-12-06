// src/managers/interfaces/IEdgeManager.js
import {IManager} from './IManager.js';

/**
 * @class IEdgeManager
 * @extends IManager
 * @classdesc Interface for edge-related operations in the knowledge graph. Defines the contract for managing edges, including adding, updating, deleting, and retrieving edges.
 */
export class IEdgeManager extends IManager {
    /**
     * Adds new edges to the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects to add. Each edge should have `from`, `to`, and `edgeType`.
     * @returns {Promise<Array<Object>>} - Promise resolving to an array of newly added edges.
     * @throws {Error} Method not implemented.
     */
    async addEdges(edges) {
        throw new Error('Method not implemented');
    }

    /**
     * Updates existing edges in the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects with updates. Each edge must have `from`, `to`, and `edgeType` to identify it, and can include `newFrom`, `newTo`, and/or `newEdgeType` for updates.
     * @returns {Promise<Array<Object>>} - Promise resolving to an array of updated edges.
     * @throws {Error} Method not implemented.
     */
    async updateEdges(edges) {
        throw new Error('Method not implemented');
    }

    /**
     * Deletes edges from the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects to delete. Each edge should have `from`, `to`, and `edgeType`.
     * @returns {Promise<void>} - Promise resolving when deletion is complete.
     * @throws {Error} Method not implemented.
     */
    async deleteEdges(edges) {
        throw new Error('Method not implemented');
    }

    /**
     * Retrieves edges from the knowledge graph based on filter criteria.
     *
     * @param {Object} [filter] - Optional filter criteria.
     * @param {string} [filter.from] - Filter edges originating from this node.
     * @param {string} [filter.to] - Filter edges targeting this node.
     * @param {string} [filter.edgeType] - Filter edges of this type.
     * @returns {Promise<Array<Object>>} - Promise resolving to an array of edges matching the filter criteria.
     * @throws {Error} Method not implemented.
     */
    async getEdges(filter) {
        throw new Error('Method not implemented');
    }
}
