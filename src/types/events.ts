// src/types/events.ts

import {Edge, Graph} from "./graph.js";
import {MetadataAddition, MetadataDeletion, MetadataResult} from "./operations.js";

/**
 * Event handler function type
 */
export type EventListener = (data?: any) => void;

/**
 * Map of event names to their listeners
 */
export interface EventMap {
    [eventName: string]: Set<EventListener>;
}

/**
 * Event emitter events
 */
export interface EmitterEvents {
    initialized: { manager: string };
    beforeAddNodes: { nodes: Node[] };
    afterAddNodes: { nodes: Node[] };
    beforeUpdateNodes: { nodes: Node[] };
    afterUpdateNodes: { nodes: Node[] };
    beforeDeleteNodes: { nodeNames: string[] };
    afterDeleteNodes: { deletedCount: number };
    beforeAddEdges: { edges: Edge[] };
    afterAddEdges: { edges: Edge[] };
    beforeUpdateEdges: { edges: Edge[] };
    afterUpdateEdges: { edges: Edge[] };
    beforeDeleteEdges: { edges: Edge[] };
    afterDeleteEdges: { deletedCount: number };
    beforeAddMetadata: { metadata: MetadataAddition[] };
    afterAddMetadata: { results: MetadataResult[] };
    beforeDeleteMetadata: { deletions: MetadataDeletion[] };
    afterDeleteMetadata: { deletedCount: number };
    beforeSearch: { query: string };
    afterSearch: Graph;
    beforeOpenNodes: { names: string[] };
    afterOpenNodes: Graph;
    error: { operation: string; error: Error };
}