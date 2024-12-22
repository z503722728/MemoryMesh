// src/core/managers/implementations/TransactionManager.ts
import {ITransactionManager, RollbackAction} from '../interfaces/ITransactionManager.js';
import type {Graph} from '../../../types/graph.js';
import type {IStorage} from '../../../types/storage.js';

export class TransactionManager extends ITransactionManager {
    private graph: Graph;
    private rollbackActions: RollbackAction[];
    private inTransaction: boolean;

    constructor(storage: IStorage) {
        super(storage);
        this.graph = {nodes: [], edges: []};
        this.rollbackActions = [];
        this.inTransaction = false;
    }

    async beginTransaction(): Promise<void> {
        if (this.inTransaction) {
            throw new Error('Transaction already in progress');
        }

        this.emit('beforeBeginTransaction', {});

        // Load current state
        this.graph = await this.storage.loadGraph();
        this.rollbackActions = [];
        this.inTransaction = true;

        this.emit('afterBeginTransaction', {});
    }

    async addRollbackAction(action: () => Promise<void>, description: string): Promise<void> {
        if (!this.inTransaction) {
            throw new Error('No transaction in progress');
        }

        this.rollbackActions.push({action, description});
    }

    async commit(): Promise<void> {
        if (!this.inTransaction) {
            throw new Error('No transaction to commit');
        }

        this.emit('beforeCommit', {});

        // Clear the transaction state
        this.rollbackActions = [];
        this.inTransaction = false;

        this.emit('afterCommit', {});
    }

    async rollback(): Promise<void> {
        if (!this.inTransaction) {
            throw new Error('No transaction to rollback');
        }

        this.emit('beforeRollback', {actions: this.rollbackActions});

        // Execute rollback actions in reverse order
        for (const {action, description} of this.rollbackActions.reverse()) {
            try {
                await action();
            } catch (error) {
                console.error(`Error during rollback action (${description}):`, error);
                // Continue with other rollbacks even if one fails
            }
        }

        // Clear the transaction state
        this.rollbackActions = [];
        this.inTransaction = false;

        this.emit('afterRollback', {});
    }

    getCurrentGraph(): Graph {
        return this.graph;
    }

    isInTransaction(): boolean {
        return this.inTransaction;
    }
}