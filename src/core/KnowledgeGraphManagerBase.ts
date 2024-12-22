// src/core/KnowledgeGraphManagerBase.ts

import type {Graph} from '../types/graph.js';
import type {IStorage} from '../types/storage.js';
import {JsonLineStorage} from './storage/JsonLineStorage.js';
import {ManagerFactory} from './managers/ManagerFactory.js';

/**
 * Base class that handles initialization and common functionality
 */
export abstract class KnowledgeGraphManagerBase {
    protected readonly storage: IStorage;

    constructor(storage: IStorage = new JsonLineStorage()) {
        this.storage = storage;
    }

    protected createManagers() {
        return {
            nodeManager: ManagerFactory.createNodeManager(this.storage),
            edgeManager: ManagerFactory.createEdgeManager(this.storage),
            metadataManager: ManagerFactory.createMetadataManager(this.storage),
            searchManager: ManagerFactory.createSearchManager(this.storage),
            transactionManager: ManagerFactory.createTransactionManager(this.storage)
        };
    }
}