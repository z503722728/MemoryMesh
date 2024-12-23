// src/core/managers/interfaces/index.ts

import type { EventListener } from '../../../types/events.js';
import type { Graph, Node, Edge, Metadata } from '../../../types/graph.js';
import type {
    EdgeUpdate,
    EdgeFilter,
    MetadataAddition,
    MetadataResult,
    MetadataDeletion
} from '../../../types/index.js';

export { IManager } from './IManager.js';
export { INodeManager } from './INodeManager.js';
export { IEdgeManager } from './IEdgeManager.js';
export { IMetadataManager } from './IMetadataManager.js';
export { ISearchManager } from './ISearchManager.js';
export { ITransactionManager } from './ITransactionManager.js';
export {
    IManagerOperations,
    INodeOperations,
    IEdgeOperations,
    IMetadataOperations,
    ISearchOperations
} from './IManagerOperations.js';

// Re-export common types used by interfaces
export type {
    EventListener,
    Graph,
    Node,
    Edge,
    Metadata,
    EdgeUpdate,
    EdgeFilter,
    MetadataAddition,
    MetadataResult,
    MetadataDeletion
};