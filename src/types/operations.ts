// src/types/operations.ts

import type {Edge, Node} from "./graph.js";

/**
 * Edge update operation parameters
 */
export interface EdgeUpdate {
    from: string;
    to: string;
    edgeType: string;
    newFrom?: string;
    newTo?: string;
    newEdgeType?: string;
}

/**
 * Edge filter parameters
 */
export interface EdgeFilter {
    from?: string;
    to?: string;
    edgeType?: string;
}

/**
 * Metadata addition parameters
 */
export interface MetadataAddition {
    nodeName: string;
    contents: string[];
}

/**
 * Metadata deletion parameters
 */
export interface MetadataDeletion {
    nodeName: string;
    metadata: string[];
}

/**
 * Result of metadata operation
 */
export interface MetadataResult {
    nodeName: string;
    addedMetadata: string[];
}

/**
 * Result of opening nodes
 */
export interface OpenNodesResult {
    nodes: Node[];
    edges: Edge[];
}

/**
 * Result of getting edges
 */
export interface GetEdgesResult {
    edges: Edge[];
}