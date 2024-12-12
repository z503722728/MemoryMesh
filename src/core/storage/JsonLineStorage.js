// src/storage/JsonLineStorage.js
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {CONFIG} from '../../config/config.js';

/**
 * @class JsonLineStorage
 * @classdesc Handles persistent storage of the knowledge graph using a JSON Lines file format with optimized indexing.
 * Each line in the file represents a node or an edge in JSON format. The class maintains in-memory indices
 * for efficient edge querying and retrieval.
 */
export class JsonLineStorage {
    /**
     * Creates an instance of JsonLineStorage and initializes the indexing structures.
     *
     * @throws {Error} If initialization of storage directories fails
     */
    constructor() {
        /**
         * @private
         * @type {Object}
         * @property {Map<string, Set<string>>} byFrom - Maps source nodes to their edge IDs
         * @property {Map<string, Set<string>>} byTo - Maps target nodes to their edge IDs
         * @property {Map<string, Set<string>>} byType - Maps edge types to their edge IDs
         */
        this.edgeIndex = {
            byFrom: new Map(),
            byTo: new Map(),
            byType: new Map()
        };

        /**
         * @private
         * @type {Map<string, Object>}
         * @description Cache storing edge objects by their unique IDs
         */
        this.edgeCache = new Map();
    }

    /**
     * Loads the entire knowledge graph from storage and builds the edge indices.
     *
     * @returns {Promise<Object>} The complete graph containing nodes and edges with built indices
     * @throws {Error} If reading the file fails for reasons other than the file not existing
     */
    async loadGraph() {
        const MEMORY_FILE_PATH = CONFIG.PATHS.MEMORY_FILE;

        try {
            const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
            const lines = data.split("\n").filter(line => line.trim() !== "");

            // Clear existing indices before rebuilding
            this.clearIndices();

            return lines.reduce((graph, line) => {
                const item = JSON.parse(line);
                if (item.type === "node") {
                    graph.nodes.push(item);
                }
                if (item.type === "edge") {
                    graph.edges.push(item);
                    this.indexEdge(item);
                }
                return graph;
            }, {nodes: [], edges: []});
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === "ENOENT") {
                return {nodes: [], edges: []};
            }
            throw error;
        }
    }

    /**
     * Saves the entire knowledge graph to storage and rebuilds indices.
     *
     * @param {Object} graph - The graph object containing nodes and edges to save
     * @returns {Promise<void>}
     * @throws {Error} If writing to the file fails
     */
    async saveGraph(graph) {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const MEMORY_FILE_PATH = path.join(__dirname, '../../data/memory.json');

        // Clear and rebuild indices
        this.clearIndices();
        graph.edges.forEach(edge => this.indexEdge(edge));

        const lines = [
            ...graph.nodes.map(e => JSON.stringify({type: "node", ...e})),
            ...graph.edges.map(r => JSON.stringify({type: "edge", ...r})),
        ];
        await fs.writeFile(MEMORY_FILE_PATH, lines.join("\n"));
    }

    /**
     * Loads specific edges by their IDs from the cache.
     *
     * @param {Array<string>} edgeIds - Array of edge IDs to retrieve
     * @returns {Promise<Array<Object>>} Array of edge objects
     * @throws {Error} If any requested edge ID is not found in the cache
     */
    async loadEdgesByIds(edgeIds) {
        return edgeIds
            .map(id => this.edgeCache.get(id))
            .filter(edge => edge !== undefined);
    }

    /**
     * Indexes a single edge by adding it to all relevant indices.
     *
     * @private
     * @param {Object} edge - The edge object to index
     * @param {string} edge.from - Source node name
     * @param {string} edge.to - Target node name
     * @param {string} edge.edgeType - Type of the edge
     */
    indexEdge(edge) {
        const edgeId = this.generateEdgeId(edge);

        // Index by 'from' node
        if (!this.edgeIndex.byFrom.has(edge.from)) {
            this.edgeIndex.byFrom.set(edge.from, new Set());
        }
        this.edgeIndex.byFrom.get(edge.from).add(edgeId);

        // Index by 'to' node
        if (!this.edgeIndex.byTo.has(edge.to)) {
            this.edgeIndex.byTo.set(edge.to, new Set());
        }
        this.edgeIndex.byTo.get(edge.to).add(edgeId);

        // Index by edge type
        if (!this.edgeIndex.byType.has(edge.edgeType)) {
            this.edgeIndex.byType.set(edge.edgeType, new Set());
        }
        this.edgeIndex.byType.get(edge.edgeType).add(edgeId);

        // Cache the edge
        this.edgeCache.set(edgeId, edge);
    }

    /**
     * Generates a unique ID for an edge based on its properties.
     *
     * @private
     * @param {Object} edge - The edge object
     * @param {string} edge.from - Source node name
     * @param {string} edge.to - Target node name
     * @param {string} edge.edgeType - Type of the edge
     * @returns {string} Unique edge identifier
     */
    generateEdgeId(edge) {
        return `${edge.from}|${edge.to}|${edge.edgeType}`;
    }

    /**
     * Clears all edge indices and cache.
     *
     * @private
     */
    clearIndices() {
        this.edgeIndex.byFrom.clear();
        this.edgeIndex.byTo.clear();
        this.edgeIndex.byType.clear();
        this.edgeCache.clear();
    }

    /**
     * Validates that an edge's referenced nodes exist in the graph.
     *
     * @private
     * @param {Object} edge - The edge to validate
     * @param {Set<string>} nodeNames - Set of existing node names
     * @throws {Error} If either the source or target node doesn't exist
     */
    validateEdgeNodes(edge, nodeNames) {
        if (!nodeNames.has(edge.from)) {
            throw new Error(`Source node "${edge.from}" not found`);
        }
        if (!nodeNames.has(edge.to)) {
            throw new Error(`Target node "${edge.to}" not found`);
        }
    }
}