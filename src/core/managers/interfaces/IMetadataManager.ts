// src/core/managers/interfaces/IMetadataManager.ts+

import {IManager} from './IManager.js';
import type {Metadata} from '../../../types/graph.js';
import type {MetadataAddition, MetadataResult, MetadataDeletion} from '../../../types/index.js';

/**
 * Interface for metadata-related operations in the knowledge graph.
 * Defines the contract for managing metadata, including adding, deleting, and retrieving metadata for nodes.
 */
export abstract class IMetadataManager extends IManager {
    /**
     * Adds metadata to existing nodes.
     */
    abstract addMetadata(metadata: MetadataAddition[]): Promise<MetadataResult[]>;

    /**
     * Deletes metadata from nodes.
     */
    abstract deleteMetadata(deletions: MetadataDeletion[]): Promise<void>;

    /**
     * Retrieves metadata for a specific node.
     */
    abstract getMetadata(nodeName: string): Promise<Metadata>;
}