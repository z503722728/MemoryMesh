// src/managers/implementations/EdgeManager.js
import {IEdgeManager} from '../interfaces/IEdgeManager.js';

/**
 * @class EdgeManager
 * @extends IEdgeManager
 * @classdesc Implements edge-related operations for the knowledge graph, including adding, updating, deleting, and retrieving edges.
 */
export class EdgeManager extends IEdgeManager {
    /**
     * Creates an instance of EdgeManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     */
    constructor(storage) {
        super(storage);
    }

    /**
     * Initializes the EdgeManager by emitting the 'initialized' event.
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        this.emit('initialized');
    }

    /**
     * Adds new edges to the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects to add. Each edge should have `from`, `to`, and `edgeType`.
     * @returns {Promise<Array<Object>>} - Array of newly added edges.
     * @throws {Error} If source or target nodes are not found or if adding edges fails.
     */
    async addEdges(edges) {
        try {
            this.emit('beforeAddEdges', {edges});

            const graph = await this.storage.loadGraph();
            const newEdges = edges.filter(edge =>
                !graph.edges.some(existing =>
                    existing.from === edge.from &&
                    existing.to === edge.to &&
                    existing.edgeType === edge.edgeType
                )
            );

            if (newEdges.length === 0) {
                return [];
            }

            // Verify that nodes exist
            const nodeNames = new Set(graph.nodes.map(node => node.name));
            for (const edge of newEdges) {
                if (!nodeNames.has(edge.from)) {
                    throw new Error(`Source node "${edge.from}" not found`);
                }
                if (!nodeNames.has(edge.to)) {
                    throw new Error(`Target node "${edge.to}" not found`);
                }
            }

            graph.edges.push(...newEdges);
            await this.storage.saveGraph(graph);

            this.emit('afterAddEdges', {edges: newEdges});
            return newEdges;
        } catch (error) {
            this.emit('error', {operation: 'addEdges', error});
            throw error;
        }
    }

    /**
     * Updates existing edges in the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects with updates. Each edge must have `from`, `to`, and `edgeType` to identify it, and can include `newFrom`, `newTo`, and/or `newEdgeType` for updates.
     * @returns {Promise<Array<Object>>} - Array of updated edges.
     * @throws {Error} If the edge to update is not found, if the new source or target nodes are not found, or if updating edges fails.
     */
    async updateEdges(edges) {
        try {
            this.emit('beforeUpdateEdges', {edges});

            const graph = await this.storage.loadGraph();
            const updatedEdges = [];

            for (const updateEdge of edges) {
                const edgeIndex = graph.edges.findIndex(existing =>
                    existing.from === updateEdge.from &&
                    existing.to === updateEdge.to &&
                    existing.edgeType === updateEdge.edgeType
                );

                if (edgeIndex === -1) {
                    throw new Error(`Edge not found: ${updateEdge.from} -> ${updateEdge.to} (${updateEdge.edgeType})`);
                }

                // Verify that nodes exist for any updated node references
                const nodeNames = new Set(graph.nodes.map(node => node.name));
                if (updateEdge.newFrom && !nodeNames.has(updateEdge.newFrom)) {
                    throw new Error(`Source node "${updateEdge.newFrom}" not found`);
                }
                if (updateEdge.newTo && !nodeNames.has(updateEdge.newTo)) {
                    throw new Error(`Target node "${updateEdge.newTo}" not found`);
                }

                const updatedEdge = {
                    ...graph.edges[edgeIndex],
                    from: updateEdge.newFrom || graph.edges[edgeIndex].from,
                    to: updateEdge.newTo || graph.edges[edgeIndex].to,
                    edgeType: updateEdge.newEdgeType || graph.edges[edgeIndex].edgeType
                };

                graph.edges[edgeIndex] = updatedEdge;
                updatedEdges.push(updatedEdge);
            }

            await this.storage.saveGraph(graph);

            this.emit('afterUpdateEdges', {edges: updatedEdges});
            return updatedEdges;
        } catch (error) {
            this.emit('error', {operation: 'updateEdges', error});
            throw error;
        }
    }

    /**
     * Deletes edges from the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects to delete. Each edge should have `from`, `to`, and `edgeType`.
     * @returns {Promise<void>}
     * @throws {Error} If deleting edges fails.
     */
    async deleteEdges(edges) {
        try {
            this.emit('beforeDeleteEdges', {edges});

            const graph = await this.storage.loadGraph();
            const initialEdgeCount = graph.edges.length;

            graph.edges = graph.edges.filter(existing =>
                !edges.some(edge =>
                    existing.from === edge.from &&
                    existing.to === edge.to &&
                    existing.edgeType === edge.edgeType
                )
            );

            await this.storage.saveGraph(graph);

            const deletedCount = initialEdgeCount - graph.edges.length;
            this.emit('afterDeleteEdges', {deletedCount});
        } catch (error) {
            this.emit('error', {operation: 'deleteEdges', error});
            throw error;
        }
    }

    /**
     * Retrieves edges from the knowledge graph based on filter criteria.
     *
     * @param {Object} [filter] - Optional filter criteria.
     * @param {string} [filter.from] - Filter edges originating from this node.
     * @param {string} [filter.to] - Filter edges targeting this node.
     * @param {string} [filter.edgeType] - Filter edges of this type.
     * @returns {Promise<Array<Object>>} - Array of edges matching the filter criteria.
     * @throws {Error} If retrieving edges fails.
     */
    async getEdges(filter) {
        try {
            const graph = await this.storage.loadGraph();
            if (!filter) {
                return graph.edges;
            }

            return graph.edges.filter(edge => {
                if (filter.from && edge.from !== filter.from) return false;
                if (filter.to && edge.to !== filter.to) return false;
                if (filter.edgeType && edge.edgeType !== filter.edgeType) return false;
                return true;
            });
        } catch (error) {
            this.emit('error', {operation: 'getEdges', error});
            throw error;
        }
    }
}
