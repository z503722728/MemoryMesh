// src/core/managers/ManagerFactory.ts

import {NodeManager} from './implementations/NodeManager.js';
import {EdgeManager} from './implementations/EdgeManager.js';
import {MetadataManager} from './implementations/MetadataManager.js';
import {SearchManager} from './implementations/SearchManager.js';
import {TransactionManager} from './implementations/TransactionManager.js';
import type {IStorage} from '../../types/storage.js';

/**
 * Factory class responsible for creating instances of various manager classes
 * used in the knowledge graph.
 */
export class ManagerFactory {
    /**
     * Creates a new instance of NodeManager.
     */
    static createNodeManager(storage: IStorage): NodeManager {
        return new NodeManager(storage);
    }

    /**
     * Creates a new instance of EdgeManager.
     */
    static createEdgeManager(storage: IStorage): EdgeManager {
        return new EdgeManager(storage);
    }

    /**
     * Creates a new instance of MetadataManager.
     */
    static createMetadataManager(storage: IStorage): MetadataManager {
        return new MetadataManager(storage);
    }

    /**
     * Creates a new instance of SearchManager.
     */
    static createSearchManager(storage: IStorage): SearchManager {
        return new SearchManager(storage);
    }

    /**
     * Creates a new instance of TransactionManager.
     */
    static createTransactionManager(storage: IStorage): TransactionManager {
        return new TransactionManager(storage);
    }
}