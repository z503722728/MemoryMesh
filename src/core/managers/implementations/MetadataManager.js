// src/managers/implementations/MetadataManager.js
import {IMetadataManager} from '../interfaces/IMetadataManager.js';

/**
 * @class MetadataManager
 * @extends IMetadataManager
 * @classdesc Implements metadata-related operations for the knowledge graph, including adding, deleting, and retrieving metadata associated with nodes.
 */
export class MetadataManager extends IMetadataManager {
    /**
     * Creates an instance of MetadataManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     */
    constructor(storage) {
        super(storage);
    }

    /**
     * Initializes the MetadataManager by emitting the 'initialized' event.
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        this.emit('initialized');
    }

    /**
     * Adds metadata to existing nodes.
     *
     * @param {Array<Object>} metadata - Array of metadata objects to add. Each object should have `nodeName` and `contents`.
     * @returns {Promise<Array<Object>>} - Results of metadata additions.
     * @throws {Error} If the specified node is not found or adding metadata fails.
     */
    async addMetadata(metadata) {
        try {
            this.emit('beforeAddMetadata', {metadata});

            const graph = await this.storage.loadGraph();
            const results = metadata.map(o => {
                const node = graph.nodes.find(e => e.name === o.nodeName);
                if (!node) {
                    throw new Error(`Node with name ${o.nodeName} not found`);
                }

                if (!Array.isArray(node.metadata)) {
                    node.metadata = [];
                }

                const newMetadata = o.contents.filter(content =>
                    !node.metadata.includes(content)
                );

                node.metadata.push(...newMetadata);
                return {
                    nodeName: o.nodeName,
                    addedMetadata: newMetadata
                };
            });

            await this.storage.saveGraph(graph);

            this.emit('afterAddMetadata', {results});
            return results;
        } catch (error) {
            this.emit('error', {operation: 'addMetadata', error});
            throw error;
        }
    }

    /**
     * Deletes metadata from nodes.
     *
     * @param {Array<Object>} deletions - Array of metadata deletion objects. Each object should have `nodeName` and `metadata`.
     * @returns {Promise<void>}
     * @throws {Error} If deleting metadata fails.
     */
    async deleteMetadata(deletions) {
        try {
            this.emit('beforeDeleteMetadata', {deletions});

            const graph = await this.storage.loadGraph();

            deletions.forEach(d => {
                const node = graph.nodes.find(e => e.name === d.nodeName);
                if (node) {
                    node.metadata = node.metadata.filter(o =>
                        !d.metadata.includes(o)
                    );
                }
            });

            await this.storage.saveGraph(graph);

            this.emit('afterDeleteMetadata', {deletions});
        } catch (error) {
            this.emit('error', {operation: 'deleteMetadata', error});
            throw error;
        }
    }

    /**
     * Retrieves metadata for a specific node.
     *
     * @param {string} nodeName - Name of the node to retrieve metadata for.
     * @returns {Promise<Array<string>>} - Array of metadata contents associated with the node.
     * @throws {Error} If the node is not found or retrieving metadata fails.
     */
    async getMetadata(nodeName) {
        try {
            const graph = await this.storage.loadGraph();
            const node = graph.nodes.find(e => e.name === nodeName);

            if (!node) {
                throw new Error(`Node with name ${nodeName} not found`);
            }

            return node.metadata || [];
        } catch (error) {
            this.emit('error', {operation: 'getMetadata', error});
            throw error;
        }
    }
}
