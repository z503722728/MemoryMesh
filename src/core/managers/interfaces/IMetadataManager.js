// src/managers/interfaces/IMetadataManager.js
import {IManager} from './IManager.js';

/**
 * @class IMetadataManager
 * @extends IManager
 * @classdesc Interface for metadata-related operations in the knowledge graph. Defines the contract for managing metadata, including adding, deleting, and retrieving metadata for nodes.
 */
export class IMetadataManager extends IManager {
    /**
     * Adds metadata to existing nodes.
     *
     * @param {Array<Object>} metadata - Array of metadata objects to add. Each object should have `nodeName` and `contents`.
     * @returns {Promise<Array<Object>>} - Promise resolving to the results of metadata additions.
     * @throws {Error} Method not implemented.
     */
    async addMetadata(metadata) {
        throw new Error('Method not implemented');
    }

    /**
     * Deletes metadata from nodes.
     *
     * @param {Array<Object>} deletions - Array of metadata deletion objects. Each object should have `nodeName` and `metadata`.
     * @returns {Promise<void>} - Promise resolving when deletion is complete.
     * @throws {Error} Method not implemented.
     */
    async deleteMetadata(deletions) {
        throw new Error('Method not implemented');
    }

    /**
     * Retrieves metadata for a specific node.
     *
     * @param {string} nodeName - Name of the node to retrieve metadata for.
     * @returns {Promise<Array<string>>} - Promise resolving to an array of metadata contents associated with the node.
     * @throws {Error} Method not implemented.
     */
    async getMetadata(nodeName) {
        throw new Error('Method not implemented');
    }
}
