// src/managers/interfaces/ISearchManager.js
import {IManager} from './IManager.js';

/**
 * @class ISearchManager
 * @extends IManager
 * @classdesc Interface for search-related operations in the knowledge graph. Defines the contract for searching nodes based on queries and retrieving specific nodes.
 */
export class ISearchManager extends IManager {
    /**
     * Searches for nodes in the knowledge graph based on a query.
     *
     * @param {string} query - The search query string.
     * @returns {Promise<Object>} - Promise resolving to a filtered graph containing matching nodes and their edges.
     * @throws {Error} Method not implemented.
     */
    async searchNodes(query) {
        throw new Error('Method not implemented');
    }

    /**
     * Retrieves specific nodes from the knowledge graph by their names.
     *
     * @param {Array<string>} names - Array of node names to retrieve.
     * @returns {Promise<Object>} - Promise resolving to a filtered graph containing specified nodes and their edges.
     * @throws {Error} Method not implemented.
     */
    async openNodes(names) {
        throw new Error('Method not implemented');
    }
}
