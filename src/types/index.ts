// src/types/index.ts

// Base type exports
export * from './graph.js';
export * from './events.js';
export * from './tools.js';
export * from './storage.js';

// Operation types and results
export type {
    EdgeUpdate,
    EdgeFilter,
    MetadataAddition,
    MetadataDeletion,
    MetadataResult,
    GetEdgesResult,
    OpenNodesResult,
    GraphOperationResult,
    SearchOperationResult,
    MetadataOperationResult
} from './operations.js';