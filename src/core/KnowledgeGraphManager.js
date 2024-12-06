// src/KnowledgeGraphManager.js

import {JsonLineStorage} from './storage/JsonLineStorage.js';
import {ManagerFactory} from './managers/ManagerFactory.js';

/**
 * @class KnowledgeGraphManager
 * @classdesc Manages the operations related to the knowledge graph, including adding, updating, deleting nodes and edges, as well as handling metadata and search functionalities.
 */
export class KnowledgeGraphManager {
    /**
     * Creates an instance of KnowledgeGraphManager.
     *
     * @param {Object} [storage=new JsonLineStorage()] - The storage mechanism to use for persisting the knowledge graph.
     */
    constructor(storage = new JsonLineStorage()) {
        /**
         * @private
         * @type {JsonLineStorage}
         * @description The storage instance used to load and save the knowledge graph.
         */
        this.storage = storage;

        /**
         * @private
         * @type {INodeManager}
         * @description Manager responsible for handling node-related operations.
         */
        this.nodeManager = ManagerFactory.createNodeManager(this.storage);

        /**
         * @private
         * @type {IEdgeManager}
         * @description Manager responsible for handling edge-related operations.
         */
        this.edgeManager = ManagerFactory.createEdgeManager(this.storage);

        /**
         * @private
         * @type {IMetadataManager}
         * @description Manager responsible for handling metadata-related operations.
         */
        this.metadataManager = ManagerFactory.createMetadataManager(this.storage);

        /**
         * @private
         * @type {ISearchManager}
         * @description Manager responsible for handling search-related operations.
         */
        this.searchManager = ManagerFactory.createSearchManager(this.storage);
    }

    /**
     * Adds new nodes to the knowledge graph.
     *
     * @param {Array<Object>} nodes - Array of node objects to add. Each node should have at least a `name` and `nodeType`.
     * @returns {Promise<Array<Object>>} - Array of newly added nodes.
     * @throws {Error} If adding nodes fails.
     */
    async addNodes(nodes) {
        return this.nodeManager.addNodes(nodes);
    }

    /**
     * Updates existing nodes in the knowledge graph.
     *
     * @param {Array<Object>} nodes - Array of node objects with updates. Each node must have a `name` to identify it.
     * @returns {Promise<Array<Object>>} - Array of updated nodes.
     * @throws {Error} If updating nodes fails.
     */
    async updateNodes(nodes) {
        return this.nodeManager.updateNodes(nodes);
    }

    /**
     * Adds new edges between nodes in the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects to add. Each edge should have `from`, `to`, and `edgeType`.
     * @returns {Promise<Array<Object>>} - Array of newly added edges.
     * @throws {Error} If adding edges fails.
     */
    async addEdges(edges) {
        return this.edgeManager.addEdges(edges);
    }

    /**
     * Updates existing edges in the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects with updates. Each edge must have `from`, `to`, and `edgeType` to identify it.
     * @returns {Promise<Array<Object>>} - Array of updated edges.
     * @throws {Error} If updating edges fails.
     */
    async updateEdges(edges) {
        return this.edgeManager.updateEdges(edges);
    }

    /**
     * Adds metadata to existing nodes.
     *
     * @param {Array<Object>} metadata - Array of metadata objects to add. Each object should have `nodeName` and `contents`.
     * @returns {Promise<Array<Object>>} - Results of metadata additions.
     * @throws {Error} If adding metadata fails.
     */
    async addMetadata(metadata) {
        return this.metadataManager.addMetadata(metadata);
    }

    /**
     * Deletes nodes and their associated edges from the knowledge graph.
     *
     * @param {Array<string>} nodeNames - Array of node names to delete.
     * @returns {Promise<void>}
     * @throws {Error} If deleting nodes fails.
     */
    async deleteNodes(nodeNames) {
        await this.nodeManager.deleteNodes(nodeNames);
    }

    /**
     * Deletes metadata from nodes.
     *
     * @param {Array<Object>} deletions - Array of metadata deletion objects. Each object should have `nodeName` and `metadata`.
     * @returns {Promise<void>}
     * @throws {Error} If deleting metadata fails.
     */
    async deleteMetadata(deletions) {
        await this.metadataManager.deleteMetadata(deletions);
    }

    /**
     * Deletes edges from the knowledge graph.
     *
     * @param {Array<Object>} edges - Array of edge objects to delete. Each edge should have `from`, `to`, and `edgeType`.
     * @returns {Promise<void>}
     * @throws {Error} If deleting edges fails.
     */
    async deleteEdges(edges) {
        await this.edgeManager.deleteEdges(edges);
    }

    /**
     * Reads the entire knowledge graph.
     *
     * @returns {Promise<Object>} - The complete graph with nodes and edges.
     * @throws {Error} If reading the graph fails.
     */
    async readGraph() {
        return this.storage.loadGraph();
    }

    /**
     * Searches for nodes based on a query.
     *
     * @param {string} query - Search query string.
     * @returns {Promise<Object>} - Filtered graph containing matching nodes and their edges.
     * @throws {Error} If the search operation fails.
     */
    async searchNodes(query) {
        return this.searchManager.searchNodes(query);
    }

    /**
     * Retrieves specific nodes by their names.
     *
     * @param {Array<string>} names - Array of node names to retrieve.
     * @returns {Promise<Object>} - Filtered graph containing specified nodes and their edges.
     * @throws {Error} If retrieving nodes fails.
     */
    async openNodes(names) {
        return this.searchManager.openNodes(names);
    }
}
