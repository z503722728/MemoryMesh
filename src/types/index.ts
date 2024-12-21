// src/types/index.ts

export * from './graph.js';
export * from './events.js';
export * from './tools.js';

export type {
    IManagerOperations,
    INodeOperations,
    IEdgeOperations,
    IMetadataOperations,
    ISearchOperations,
    KnowledgeGraphManager,
    IManager,
    INodeManager,
    IEdgeManager,
    IMetadataManager,
    ISearchManager
} from './managers.js';

export type {
    EdgeUpdate,
    EdgeFilter,
    MetadataAddition,
    MetadataDeletion,
    MetadataResult,
    GetEdgesResult, // Now explicitly exported
    OpenNodesResult // Now explicitly exported
} from './operations.js';

export type {
    EdgeIndex,
    IStorage // Now explicitly exported
} from './storage.js';