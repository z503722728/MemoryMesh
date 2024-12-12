// src/core/managers/implementations/EdgeManager.js
import {IEdgeManager} from '../interfaces/IEdgeManager.js';
import {formatToolResponse, formatToolError} from '../../../utils/responseFormatter.js';

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
     * @returns {Promise<Object>} - Formatted tool response containing the newly added edges or an error.
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
                return formatToolResponse({
                    data: {edges: []},
                    message: "No new edges to add",
                    actionTaken: "Checked for existing edges"
                });
            }

            // Verify that nodes exist
            const nodeNames = new Set(graph.nodes.map(node => node.name));
            for (const edge of newEdges) {
                if (!nodeNames.has(edge.from)) {
                    return formatToolError({
                        operation: 'addEdges',
                        error: `Source node not found: ${edge.from}`,
                        context: {edge},
                        suggestions: ["Ensure the source node exists before adding the edge"]
                    });
                }
                if (!nodeNames.has(edge.to)) {
                    return formatToolError({
                        operation: 'addEdges',
                        error: `Target node not found: ${edge.to}`,
                        context: {edge},
                        suggestions: ["Ensure the target node exists before adding the edge"]
                    });
                }
            }

            graph.edges.push(...newEdges);
            await this.storage.saveGraph(graph);

            this.emit('afterAddEdges', {edges: newEdges});
            return formatToolResponse({
                data: {edges: newEdges},
                message: `Successfully added ${newEdges.length} edges`,
                actionTaken: "Added edges to the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'addEdges',
                error: error.message,
                context: {edges},
                suggestions: ["Check the format of the edge data", "Ensure that both source and target nodes exist"]
            });
        }
    }

    /**
     * Updates existing edges in the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects with updates. Each edge must have `from`, `to`, and `edgeType` to identify it, and can include `newFrom`, `newTo`, and/or `newEdgeType` for updates.
     * @returns {Promise<Object>} - Formatted tool response containing the updated edges or an error.
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
                    return formatToolError({
                        operation: 'updateEdges',
                        error: `Edge not found: ${updateEdge.from} -> ${updateEdge.to} (${updateEdge.edgeType})`,
                        context: {edge: updateEdge},
                        suggestions: ["Ensure the edge you are trying to update exists"]
                    });
                }

                // Verify that nodes exist for any updated node references
                const nodeNames = new Set(graph.nodes.map(node => node.name));
                if (updateEdge.newFrom && !nodeNames.has(updateEdge.newFrom)) {
                    return formatToolError({
                        operation: 'updateEdges',
                        error: `New source node not found: ${updateEdge.newFrom}`,
                        context: {edge: updateEdge},
                        suggestions: ["Ensure the new source node exists"]
                    });
                }
                if (updateEdge.newTo && !nodeNames.has(updateEdge.newTo)) {
                    return formatToolError({
                        operation: 'updateEdges',
                        error: `New target node not found: ${updateEdge.newTo}`,
                        context: {edge: updateEdge},
                        suggestions: ["Ensure the new target node exists"]
                    });
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
            return formatToolResponse({
                data: {edges: updatedEdges},
                message: `Successfully updated ${updatedEdges.length} edges`,
                actionTaken: "Updated edges in the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'updateEdges',
                error: error.message,
                context: {edges},
                suggestions: ["Check the format of the edge data", "Ensure that the edges you are trying to update exist"]
            });
        }
    }

    /**
     * Deletes edges from the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects to delete. Each edge should have `from`, `to`, and `edgeType`.
     * @returns {Promise<Object>} - Formatted tool response indicating the result of the operation or an error.
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

            const deletedCount = initialEdgeCount - graph.edges.length;

            await this.storage.saveGraph(graph);

            this.emit('afterDeleteEdges', {deletedCount});
            return formatToolResponse({
                message: `Successfully deleted ${deletedCount} edges`,
                actionTaken: "Deleted edges from the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'deleteEdges',
                error: error.message,
                context: {edges},
                suggestions: ["Check the format of the edge data", "Ensure that the edges you are trying to delete exist"]
            });
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
     * @returns {Promise<Object>} - Formatted tool response containing the matching edges or an error.
     */
    async getEdges(filter) {
        try {
            // If no filter, return all edges (unchanged behavior)
            if (!filter) {
                const graph = await this.storage.loadGraph();
                return formatToolResponse({
                    data: {edges: graph.edges},
                    message: "Retrieved all edges",
                    actionTaken: "Retrieved edges from the knowledge graph"
                });
            }

            // Get candidate edge IDs using indices
            let candidateIds = null;

            // Step 1: Filter by 'from' node
            if (filter.from) {
                candidateIds = this.storage.edgeIndex.byFrom.get(filter.from) || new Set();
                // If we have a 'from' filter but no matches, return empty array
                if (candidateIds.size === 0) {
                    return formatToolResponse({
                        data: {edges: []},
                        message: `No edges found originating from: ${filter.from}`,
                        actionTaken: "Filtered edges by source node"
                    });
                }
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
                if (candidateIds.size === 0) {
                    return formatToolResponse({
                        data: {edges: []},
                        message: `No edges found targeting: ${filter.to}`,
                        actionTaken: "Filtered edges by target node"
                    });
                }
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
                if (candidateIds.size === 0) {
                    return formatToolResponse({
                        data: {edges: []},
                        message: `No edges found of type: ${filter.edgeType}`,
                        actionTaken: "Filtered edges by edge type"
                    });
                }
            }

            // If we have no candidates after all filters, return empty array
            if (!candidateIds || candidateIds.size === 0) {
                return formatToolResponse({
                    data: {edges: []},
                    message: "No edges found matching the provided filters",
                    actionTaken: "Filtered edges by the provided criteria"
                });
            }

            // Load only the filtered edges
            const edges = await this.storage.loadEdgesByIds(Array.from(candidateIds));
            return formatToolResponse({
                data: {edges},
                message: `Successfully retrieved ${edges.length} edges`,
                actionTaken: "Retrieved edges from the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'getEdges',
                error: error.message,
                context: {filter},
                suggestions: ["Check the format of the filter criteria", "Ensure that the nodes and edge types you are filtering by exist"]
            });
        }
    }
}