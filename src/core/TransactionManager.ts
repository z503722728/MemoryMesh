// src/core/TransactionManager.ts

import {KnowledgeGraphManagerBase} from './KnowledgeGraphManagerBase.js';
import {TransactionOperations} from './operations/index.js';
import type {Graph} from '../types/graph.js';
import {IStorage} from "../types/index.js";

/**
 * Handles transaction-related operations
 */
export class TransactionManager extends KnowledgeGraphManagerBase {
    private readonly transactionOperations: TransactionOperations;

    constructor(storage?: IStorage) {
        super(storage);
        const {transactionManager} = this.createManagers();
        this.transactionOperations = new TransactionOperations(transactionManager);
    }

    async beginTransaction(): Promise<void> {
        return this.transactionOperations.beginTransaction();
    }

    async commit(): Promise<void> {
        return this.transactionOperations.commit();
    }

    async rollback(): Promise<void> {
        return this.transactionOperations.rollback();
    }

    async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
        return this.transactionOperations.withTransaction(operation);
    }

    async addRollbackAction(action: () => Promise<void>, description: string): Promise<void> {
        return this.transactionOperations.addRollbackAction(action, description);
    }

    isInTransaction(): boolean {
        return this.transactionOperations.isInTransaction();
    }

    getCurrentGraph(): Graph {
        return this.transactionOperations.getCurrentGraph();
    }
}