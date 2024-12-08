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
     * Retrieves edges from the knowledge graph based on filter criteria, using an optimized
     * index-based approach to minimize memory usage and improve query performance.
     *
     * @param {Object} [filter] - Optional filter criteria. If not provided, returns all edges.
     * @param {string} [filter.from] - Filter edges originating from this node. Utilizes the byFrom index for O(1) lookup.
     * @param {string} [filter.to] - Filter edges targeting this node. Utilizes the byTo index for O(1) lookup.
     * @param {string} [filter.edgeType] - Filter edges of this type. Utilizes the byType index for O(1) lookup.
     * @returns {Promise<Array<Object>>} - Array of edges matching all provided filter criteria. Returns an empty array if no matches found.
     * @throws {Error} If retrieving edges fails or if index access fails.
     */
    async getEdges(filter) {
        try {
            // If no filter, return all edges (unchanged behavior)
            if (!filter) {
                const graph = await this.storage.loadGraph();
                return graph.edges;
            }

            // Get candidate edge IDs using indices
            let candidateIds = null;

            // Step 1: Filter by 'from' node
            if (filter.from) {
                candidateIds = this.storage.edgeIndex.byFrom.get(filter.from) || new Set();
                // If we have a 'from' filter but no matches, return empty array
                if (candidateIds.size === 0) return [];
            }

            // Step 2: Filter by 'to' node
            if (filter.to) {
                const toIds = this.storage.edgeIndex.byTo.get(filter.to) || new Set();
                if (candidateIds) {
                    // Intersect with existing candidates
                    candidateIds = new Set([...candidateIds].filter(id => toIds.has(id)));
                } else {
                    // First filter, use all 'to' matches
                    candidateIds = toIds;
                }
                // If intersection is empty, return empty array
                if (candidateIds.size === 0) return [];
            }

            // Step 3: Filter by edge type
            if (filter.edgeType) {
                const typeIds = this.storage.edgeIndex.byType.get(filter.edgeType) || new Set();
                if (candidateIds) {
                    // Intersect with existing candidates
                    candidateIds = new Set([...candidateIds].filter(id => typeIds.has(id)));
                } else {
                    // First filter, use all type matches
                    candidateIds = typeIds;
                }
                // If intersection is empty, return empty array
                if (candidateIds.size === 0) return [];
            }

            // If we have no candidates after all filters, return empty array
            if (!candidateIds || candidateIds.size === 0) return [];

            // Load only the filtered edges
            const edges = await this.storage.loadEdgesByIds(Array.from(candidateIds));
            return edges;
        } catch (error) {
            this.emit('error', {operation: 'getEdges', error});
            throw error;
        }
    }
}
