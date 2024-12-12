// src/core/managers/implementations/MetadataManager.js
import {IMetadataManager} from '../interfaces/IMetadataManager.js';
import {formatToolResponse, formatToolError} from '../../../utils/responseFormatter.js';

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
     * Adds metadata to existing nodes.
     *
     * @param {Array<Object>} metadata - Array of metadata objects to add. Each object should have `nodeName` and `contents`.
     * @returns {Promise<Object>} - Formatted tool response containing the results of metadata additions or an error.
     */
    async addMetadata(metadata) {
        try {
            this.emit('beforeAddMetadata', {metadata});

            const graph = await this.storage.loadGraph();
            const results = [];

            for (const item of metadata) {
                const node = graph.nodes.find(e => e.name === item.nodeName);
                if (!node) {
                    return formatToolError({
                        operation: 'addMetadata',
                        error: `Node not found: ${item.nodeName}`,
                        context: {metadataItem: item},
                        suggestions: ["Ensure the node exists before adding metadata"]
                    });
                }

                if (!Array.isArray(node.metadata)) {
                    node.metadata = [];
                }

                const newMetadata = item.contents.filter(content =>
                    !node.metadata.includes(content)
                );

                node.metadata.push(...newMetadata);
                results.push({
                    nodeName: item.nodeName,
                    addedMetadata: newMetadata
                });
            }

            await this.storage.saveGraph(graph);

            this.emit('afterAddMetadata', {results});
            return formatToolResponse({
                data: {results},
                message: `Successfully added metadata to ${results.length} nodes`,
                actionTaken: "Added metadata to nodes"
            });
        } catch (error) {
            return formatToolError({
                operation: 'addMetadata',
                error: error.message,
                context: {metadata},
                suggestions: ["Check the format of the metadata", "Ensure that the nodes you are adding metadata to exist"]
            });
        }
    }

    /**
     * Deletes metadata from nodes.
     *
     * @param {Array<Object>} deletions - Array of metadata deletion objects. Each object should have `nodeName` and `metadata`.
     * @returns {Promise<Object>} - Formatted tool response indicating the result of the operation or an error.
     */
    async deleteMetadata(deletions) {
        try {
            this.emit('beforeDeleteMetadata', {deletions});

            const graph = await this.storage.loadGraph();
            let deletedCount = 0;

            for (const deletion of deletions) {
                const node = graph.nodes.find(e => e.name === deletion.nodeName);
                if (node) {
                    const initialMetadataCount = node.metadata.length;
                    node.metadata = node.metadata.filter(o =>
                        !deletion.metadata.includes(o)
                    );
                    deletedCount += initialMetadataCount - node.metadata.length;
                }
            }

            await this.storage.saveGraph(graph);

            this.emit('afterDeleteMetadata', {deletedCount});
            return formatToolResponse({
                message: `Successfully deleted metadata from nodes. Total deleted: ${deletedCount}`,
                actionTaken: "Deleted metadata from nodes"
            });
        } catch (error) {
            return formatToolError({
                operation: 'deleteMetadata',
                error: error.message,
                context: {deletions},
                suggestions: ["Check the format of the deletion requests", "Ensure that the nodes and metadata you are trying to delete exist"]
            });
        }
    }

    /**
     * Retrieves metadata for a specific node.
     *
     * @param {string} nodeName - Name of the node to retrieve metadata for.
     * @returns {Promise<Object>} - Formatted tool response containing the node's metadata or an error.
     */
    async getMetadata(nodeName) {
        try {
            const graph = await this.storage.loadGraph();
            const node = graph.nodes.find(e => e.name === nodeName);

            if (!node) {
                return formatToolError({
                    operation: 'getMetadata',
                    error: `Node not found: ${nodeName}`,
                    context: {nodeName},
                    suggestions: ["Ensure the node exists"]
                });
            }

            return formatToolResponse({
                data: {metadata: node.metadata || []},
                message: `Successfully retrieved metadata for node: ${nodeName}`,
                actionTaken: "Retrieved metadata for a node"
            });
        } catch (error) {
            return formatToolError({
                operation: 'getMetadata',
                error: error.message,
                context: {nodeName},
                suggestions: ["Check the connection to the storage", "Ensure that the node exists"]
            });
        }
    }
}