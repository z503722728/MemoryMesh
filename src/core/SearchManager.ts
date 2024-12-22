// src/core/SearchManager.ts

import {KnowledgeGraphManagerBase} from './KnowledgeGraphManagerBase.js';
import {SearchOperations} from './operations/index.js';
import type {Graph} from '../types/graph.js';
import type {IStorage, OpenNodesResult} from '../types/index.js';

/**
 * Handles search-related operations
 */
export class SearchManager extends KnowledgeGraphManagerBase {
    private readonly searchOperations: SearchOperations;

    constructor(storage?: IStorage) {
        super(storage);
        const {searchManager} = this.createManagers();
        this.searchOperations = new SearchOperations(searchManager);
    }

    async readGraph(): Promise<Graph> {
        return this.searchOperations.readGraph();
    }

    async searchNodes(query: string): Promise<OpenNodesResult> {
        return this.searchOperations.searchNodes(query);
    }

    async openNodes(names: string[]): Promise<OpenNodesResult> {
        return this.searchOperations.openNodes(names);
    }
}