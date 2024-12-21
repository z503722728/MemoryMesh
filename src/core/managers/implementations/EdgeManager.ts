// src/core/managers/implementations/EdgeManager.ts

import {IEdgeManager} from '../interfaces/IEdgeManager.js';
import type {Edge} from '../../../types/graph.js';
import type {EdgeUpdate, EdgeFilter} from '../../../types/index.js';

/**
 * Implements edge-related operations for the knowledge graph.
 * Includes adding, updating, deleting, and retrieving edges.
 */
export class EdgeManager extends IEdgeManager {
    /**
     * Adds new edges to the knowledge graph.
     */
    async addEdges(edges: Edge[]): Promise<Edge[]> {
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
                this.validateEdgeNodes(edge, nodeNames);
            }

            graph.edges.push(...newEdges);
            await this.storage.saveGraph(graph);

            this.emit('afterAddEdges', {edges: newEdges});
            return newEdges;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(errorMessage);
        }
    }

    /**
     * Updates existing edges in the knowledge graph.
     */
    async updateEdges(edges: EdgeUpdate[]): Promise<Edge[]> {
        try {
            this.emit('beforeUpdateEdges', {edges});

            const graph = await this.storage.loadGraph();
            const updatedEdges: Edge[] = [];

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
                    throw new Error(`New source node not found: ${updateEdge.newFrom}`);
                }
                if (updateEdge.newTo && !nodeNames.has(updateEdge.newTo)) {
                    throw new Error(`New target node not found: ${updateEdge.newTo}`);
                }

                const updatedEdge: Edge = {
                    type: 'edge',
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(errorMessage);
        }
    }

    /**
     * Deletes edges from the knowledge graph.
     */
    async deleteEdges(edges: Edge[]): Promise<void> {
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(errorMessage);
        }
    }

    /**
     * Retrieves edges from the knowledge graph based on filter criteria.
     */
    async getEdges(filter?: EdgeFilter): Promise<Edge[]> {
        try {
            const graph = await this.storage.loadGraph();
            if (!filter) {
                return graph.edges;
            }

            return graph.edges.filter(edge => {
                if (filter.from && edge.from !== filter.from) return false;
                if (filter.to && edge.to !== filter.to) return false;
                return !(filter.edgeType && edge.edgeType !== filter.edgeType);

            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(errorMessage);
        }
    }

    /**
     * Validates that an edge's referenced nodes exist in the graph.
     */
    private validateEdgeNodes(edge: Edge, nodeNames: Set<string>): void {
        if (!nodeNames.has(edge.from)) {
            throw new Error(`Source node not found: ${edge.from}`);
        }
        if (!nodeNames.has(edge.to)) {
            throw new Error(`Target node not found: ${edge.to}`);
        }
    }
}