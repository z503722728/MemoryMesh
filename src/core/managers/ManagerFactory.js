// src/managers/ManagerFactory.js

import {NodeManager} from './implementations/NodeManager.js';
import {EdgeManager} from './implementations/EdgeManager.js';
import {MetadataManager} from './implementations/MetadataManager.js';
import {SearchManager} from './implementations/SearchManager.js';

/**
 * @class ManagerFactory
 * @classdesc Factory class responsible for creating instances of various manager classes used in the knowledge graph.
 */
export class ManagerFactory {
    /**
     * Creates a new instance of NodeManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     * @returns {NodeManager} - A new NodeManager instance.
     */
    static createNodeManager(storage) {
        return new NodeManager(storage);
    }

    /**
     * Creates a new instance of EdgeManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     * @returns {EdgeManager} - A new EdgeManager instance.
     */
    static createEdgeManager(storage) {
        return new EdgeManager(storage);
    }

    /**
     * Creates a new instance of MetadataManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     * @returns {MetadataManager} - A new MetadataManager instance.
     */
    static createMetadataManager(storage) {
        return new MetadataManager(storage);
    }

    /**
     * Creates a new instance of SearchManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     * @returns {SearchManager} - A new SearchManager instance.
     */
    static createSearchManager(storage) {
        return new SearchManager(storage);
    }
}
