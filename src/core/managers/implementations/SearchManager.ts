// src/core/managers/implementations/SearchManager.ts

import {ISearchManager} from '../interfaces/ISearchManager.js';
import type {Graph} from '../../../types/graph.js';

/**
 * Implements search-related operations for the knowledge graph.
 * Includes searching nodes based on queries and retrieving specific nodes.
 */
export class SearchManager extends ISearchManager {
    /**
     * Searches for nodes in the knowledge graph based on a query.
     */
    async searchNodes(query: string): Promise<Graph> {
        try {
            this.emit('beforeSearch', {query});

            const graph = await this.storage.loadGraph();
            const filteredNodes = graph.nodes.filter(e =>
                e.name.toLowerCase().includes(query.toLowerCase()) ||
                e.nodeType.toLowerCase().includes(query.toLowerCase()) ||
                e.metadata.some(o => o.toLowerCase().includes(query.toLowerCase()))
            );

            const filteredNodeNames = new Set(filteredNodes.map(e => e.name));
            const filteredEdges = graph.edges.filter(r =>
                filteredNodeNames.has(r.from) && filteredNodeNames.has(r.to)
            );

            const result: Graph = {
                nodes: filteredNodes,
                edges: filteredEdges
            };

            this.emit('afterSearch', result);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(errorMessage);
        }
    }

    /**
     * Retrieves specific nodes from the knowledge graph by their names.
     */
    async openNodes(names: string[]): Promise<Graph> {
        try {
            this.emit('beforeOpenNodes', {names});

            const graph = await this.storage.loadGraph();
            const filteredNodes = graph.nodes.filter(e =>
                names.includes(e.name)
            );

            const filteredNodeNames = new Set(filteredNodes.map(e => e.name));
            const filteredEdges = graph.edges.filter(r =>
                filteredNodeNames.has(r.from) && filteredNodeNames.has(r.to)
            );

            const result: Graph = {
                nodes: filteredNodes,
                edges: filteredEdges
            };

            this.emit('afterOpenNodes', result);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(errorMessage);
        }
    }

    async readGraph(): Promise<Graph> {
        return await this.storage.loadGraph();
    }
}