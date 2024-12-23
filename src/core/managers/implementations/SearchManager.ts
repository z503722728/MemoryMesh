// src/core/managers/implementations/SearchManager.ts

import {ISearchManager} from '../interfaces/index.js';
import type {Graph} from '../../../types/graph.js';

/**
 * Implements search-related operations for the knowledge graph.
 * Provides functionality for searching nodes and retrieving graph data.
 */
export class SearchManager extends ISearchManager {
    /**
     * Searches for nodes in the knowledge graph based on a query.
     * Matches against node names, types, and metadata content.
     */
    async searchNodes(query: string): Promise<Graph> {
        try {
            this.emit('beforeSearch', {query});

            const graph = await this.storage.loadGraph();
            const filteredNodes = graph.nodes.filter(node =>
                node.name.toLowerCase().includes(query.toLowerCase()) ||
                node.nodeType.toLowerCase().includes(query.toLowerCase()) ||
                node.metadata.some(meta =>
                    meta.toLowerCase().includes(query.toLowerCase())
                )
            );

            const filteredNodeNames = new Set(filteredNodes.map(node => node.name));
            const filteredEdges = graph.edges.filter(edge =>
                filteredNodeNames.has(edge.from) && filteredNodeNames.has(edge.to)
            );

            const result: Graph = {
                nodes: filteredNodes,
                edges: filteredEdges
            };

            this.emit('afterSearch', result);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Search operation failed: ${message}`);
        }
    }

    /**
     * Retrieves specific nodes and their related edges from the knowledge graph.
     */
    async openNodes(names: string[]): Promise<Graph> {
        try {
            this.emit('beforeOpenNodes', {names});

            const graph = await this.storage.loadGraph();
            const filteredNodes = graph.nodes.filter(node =>
                names.includes(node.name)
            );

            const filteredNodeNames = new Set(filteredNodes.map(node => node.name));
            const filteredEdges = graph.edges.filter(edge =>
                filteredNodeNames.has(edge.from) && filteredNodeNames.has(edge.to)
            );

            const result: Graph = {
                nodes: filteredNodes,
                edges: filteredEdges
            };

            this.emit('afterOpenNodes', result);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to open nodes: ${message}`);
        }
    }

    /**
     * Reads and returns the entire knowledge graph.
     */
    async readGraph(): Promise<Graph> {
        try {
            this.emit('beforeReadGraph', {});
            const graph = await this.storage.loadGraph();
            this.emit('afterReadGraph', graph);
            return graph;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to read graph: ${message}`);
        }
    }

    /**
     * Initializes the search manager.
     */
    async initialize(): Promise<void> {
        try {
            await super.initialize();
            // Add any search-specific initialization here
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to initialize SearchManager: ${message}`);
        }
    }
}