// src/types/index.ts

// Base type exports
export * from './graph.js';
export * from './events.js';
export * from './tools.js';
export * from './storage.js';

// Operation types
export type {
    IGraphOperations,
    ISearchOperations,
    ITransactionOperations,
    EdgeUpdate,
    EdgeFilter,
    MetadataAddition,
    MetadataDeletion,
    MetadataResult,
    GetEdgesResult,
    OpenNodesResult
} from './operations.js';

// Manager types
export type {
    IManagerOperations,
    INodeOperations,
    IEdgeOperations,
    IMetadataOperations,
    ISearchOperations as ISearchManagerOperations,
    KnowledgeGraphManager,
    IManager,
    INodeManager,
    IEdgeManager,
    IMetadataManager,
    ISearchManager
} from './managers.js';