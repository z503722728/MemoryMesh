// src/core/managers/implementations/index.ts

import {NodeManager} from './NodeManager.js';
import {EdgeManager} from './EdgeManager.js';
import {MetadataManager} from './MetadataManager.js';
import {SearchManager} from './SearchManager.js';
import {TransactionManager} from './TransactionManager.js';
import type {RollbackAction} from '../interfaces/ITransactionManager.js';

// Export all manager implementations
export {
    NodeManager,
    EdgeManager,
    MetadataManager,
    SearchManager,
    TransactionManager
};

// Export implementation-specific types
export {RollbackAction};

// Export a convenience type for all manager implementations
export type Managers = {
    nodeManager: NodeManager;
    edgeManager: EdgeManager;
    metadataManager: MetadataManager;
    searchManager: SearchManager;
    transactionManager: TransactionManager;
};