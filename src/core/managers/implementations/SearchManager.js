// src/managers/implementations/SearchManager.js
import {ISearchManager} from '../interfaces/ISearchManager.js';

/**
 * @class SearchManager
 * @extends ISearchManager
 * @classdesc Implements search-related operations for the knowledge graph, including searching nodes based on queries and retrieving specific nodes.
 */
export class SearchManager extends ISearchManager {
    /**
     * Creates an instance of SearchManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     */
    constructor(storage) {
        super(storage);
    }

    /**
     * Initializes the SearchManager by emitting the 'initialized' event.
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        this.emit('initialized');
    }

    /**
     * Searches for nodes in the knowledge graph based on a query.
     *
     * @param {string} query - The search query string.
     * @returns {Promise<Object>} - Filtered graph containing matching nodes and their edges.
     * @throws {Error} If the search operation fails.
     */
    async searchNodes(query) {
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

            const result = {
                nodes: filteredNodes,
                edges: filteredEdges
            };

            this.emit('afterSearch', result);
            return result;
        } catch (error) {
            this.emit('error', {operation: 'searchNodes', error});
            throw error;
        }
    }

    /**
     * Retrieves specific nodes from the knowledge graph by their names.
     *
     * @param {Array<string>} names - Array of node names to retrieve.
     * @returns {Promise<Object>} - Filtered graph containing specified nodes and their edges.
     * @throws {Error} If retrieving nodes fails.
     */
    async openNodes(names) {
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

            const result = {
                nodes: filteredNodes,
                edges: filteredEdges
            };

            this.emit('afterOpenNodes', result);
            return result;
        } catch (error) {
            this.emit('error', {operation: 'openNodes', error});
            throw error;
        }
    }
}
