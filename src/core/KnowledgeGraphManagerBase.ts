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
            nodeManager: ManagerFactory.getNodeManager(this.storage),
            edgeManager: ManagerFactory.getEdgeManager(this.storage),
            metadataManager: ManagerFactory.getMetadataManager(this.storage),
            searchManager: ManagerFactory.getSearchManager(this.storage),
            transactionManager: ManagerFactory.getTransactionManager(this.storage)
        };
    }
}