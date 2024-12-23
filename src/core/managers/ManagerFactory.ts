// src/core/managers/ManagerFactory.ts

import {
    NodeManager,
    EdgeManager,
    MetadataManager,
    SearchManager,
    TransactionManager
}
    from './implementations/index.js';
import type {IStorage} from '../../types/storage.js';
import type {
    INodeManager,
    IEdgeManager,
    IMetadataManager,
    ISearchManager,
    ITransactionManager
} from './interfaces/index.js';

/**
 * Factory class responsible for creating instances of various manager classes
 * used in the knowledge graph. Ensures consistent initialization and configuration
 * of all manager instances.
 */
export class ManagerFactory {
    private static instances: {
        nodeManager?: NodeManager;
        edgeManager?: EdgeManager;
        metadataManager?: MetadataManager;
        searchManager?: SearchManager;
        transactionManager?: TransactionManager;
    } = {};

    /**
     * Creates or returns an existing instance of NodeManager
     */
    static createNodeManager(storage: IStorage): INodeManager {
        if (!this.instances.nodeManager) {
            this.instances.nodeManager = new NodeManager(storage);
        }
        return this.instances.nodeManager;
    }

    /**
     * Creates or returns an existing instance of EdgeManager
     */
    static createEdgeManager(storage: IStorage): IEdgeManager {
        if (!this.instances.edgeManager) {
            this.instances.edgeManager = new EdgeManager(storage);
        }
        return this.instances.edgeManager;
    }

    /**
     * Creates or returns an existing instance of MetadataManager
     */
    static createMetadataManager(storage: IStorage): IMetadataManager {
        if (!this.instances.metadataManager) {
            this.instances.metadataManager = new MetadataManager(storage);
        }
        return this.instances.metadataManager;
    }

    /**
     * Creates or returns an existing instance of SearchManager
     */
    static createSearchManager(storage: IStorage): ISearchManager {
        if (!this.instances.searchManager) {
            this.instances.searchManager = new SearchManager(storage);
        }
        return this.instances.searchManager;
    }

    /**
     * Creates or returns an existing instance of TransactionManager
     */
    static createTransactionManager(storage: IStorage): ITransactionManager {
        if (!this.instances.transactionManager) {
            this.instances.transactionManager = new TransactionManager(storage);
        }
        return this.instances.transactionManager;
    }

    /**
     * Creates all manager instances at once
     */
    static createAllManagers(storage: IStorage) {
        return {
            nodeManager: this.createNodeManager(storage),
            edgeManager: this.createEdgeManager(storage),
            metadataManager: this.createMetadataManager(storage),
            searchManager: this.createSearchManager(storage),
            transactionManager: this.createTransactionManager(storage)
        };
    }

    /**
     * Clears all cached manager instances
     */
    static clearInstances(): void {
        this.instances = {};
    }
}