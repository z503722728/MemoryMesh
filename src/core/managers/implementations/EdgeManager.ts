// src/core/managers/implementations/EdgeManager.ts

import {IEdgeManager} from '../interfaces/index.js';
import type {Edge} from '../../../types/graph.js';
import type {EdgeUpdate, EdgeFilter} from '../../../types/index.js';
import {ValidationUtils} from '../../utils/ValidationUtils.js';

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

            // Validate edge uniqueness and node existence using ValidationUtils
            const newEdges = edges.filter(edge => {
                ValidationUtils.validateEdgeUniqueness(graph, edge);
                return true;
            });

            if (newEdges.length === 0) {
                return [];
            }

            for (const edge of newEdges) {
                ValidationUtils.validateNodeExists(graph, edge.from);
                ValidationUtils.validateNodeExists(graph, edge.to);
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

                // Validate node existence for updated nodes using ValidationUtils
                if (updateEdge.newFrom) {
                    ValidationUtils.validateNodeExists(graph, updateEdge.newFrom);
                }
                if (updateEdge.newTo) {
                    ValidationUtils.validateNodeExists(graph, updateEdge.newTo);
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

            if (!filter || Object.keys(filter).length === 0) {
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
}