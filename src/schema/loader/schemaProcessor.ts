// src/schema/loader/schemaProcessor.ts

import {formatToolResponse, formatToolError} from '../../utils/responseFormatter.js';
import type {Node, Edge, Graph} from '../../types/graph.js';
import type {ToolResponse} from '../../types/tools.js';
import type {KnowledgeGraphManager, OpenNodesResult, GetEdgesResult} from '../../types/managers.js';
import type {SchemaConfig} from './schemaBuilder.js';

interface NodeData {
    name: string;

    [key: string]: any;
}

interface ProcessedNodeResult {
    nodes: Node[];
    edges: Edge[];
}

interface SchemaUpdateResult {
    metadata: string[];
    edgeChanges: {
        remove: Edge[];
        add: Edge[];
    };
}

/**
 * Formats a field value into a metadata string.
 */
function formatMetadataEntry(field: string, value: string | string[] | unknown): string {
    if (Array.isArray(value)) {
        return `${field}: ${value.join(', ')}`;
    }
    return `${field}: ${String(value)}`;
}

/**
 * Creates a node based on schema definition and input data.
 */
export async function createSchemaNode(
    data: NodeData,
    schema: SchemaConfig,
    nodeType: string
): Promise<ProcessedNodeResult> {
    try {
        const {metadataConfig, relationships} = schema;
        const metadata: string[] = [];
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // Create a comprehensive set of fields to exclude from additional properties
        const excludedFields = new Set<string>([
            'name',
            ...metadataConfig.requiredFields,
            ...metadataConfig.optionalFields,
            ...(metadataConfig.excludeFields || []),
        ]);

        // Add relationship fields to excluded set
        if (relationships) {
            Object.keys(relationships).forEach(field => excludedFields.add(field));
        }

        // Process required fields first
        for (const field of metadataConfig.requiredFields) {
            if (data[field] === undefined) {
                throw new Error(`Required field "${field}" is missing`);
            }
            // Skip if this field is part of a relationship
            if (!relationships || !relationships[field]) {
                metadata.push(formatMetadataEntry(field, data[field]));
            }
        }

        // Process optional fields
        for (const field of metadataConfig.optionalFields) {
            if (data[field] !== undefined && (!relationships || !relationships[field])) {
                metadata.push(formatMetadataEntry(field, data[field]));
            }
        }

        // Process relationships
        if (relationships) {
            for (const [field, config] of Object.entries(relationships)) {
                if (data[field]) {
                    const value = data[field];
                    if (Array.isArray(value)) {
                        value.forEach((target: string) => {
                            edges.push({
                                type: 'edge',
                                from: data.name,
                                to: target,
                                edgeType: config.edgeType
                            });
                        });
                    } else {
                        edges.push({
                            type: 'edge',
                            from: data.name,
                            to: value as string,
                            edgeType: config.edgeType
                        });
                    }
                    metadata.push(formatMetadataEntry(field, value));
                }
            }
        }

        // Process additional properties
        for (const [key, value] of Object.entries(data)) {
            if (!excludedFields.has(key) && value !== undefined) {
                metadata.push(formatMetadataEntry(key, value));
            }
        }

        // Create the main node
        const node: Node = {
            type: 'node',
            name: data.name,
            nodeType,
            metadata
        };
        nodes.push(node);

        return {nodes, edges};
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown error occurred while creating schema node');
    }
}

/**
 * Updates a node's metadata and relationships based on schema definition.
 */
export async function updateSchemaNode(
    updates: NodeData,
    currentNode: Node,
    schema: SchemaConfig,
    currentGraph: Graph
): Promise<SchemaUpdateResult> {
    try {
        const {metadataConfig, relationships} = schema;
        const metadata = new Map<string, string>();
        const edgeChanges = {
            remove: [] as Edge[],
            add: [] as Edge[]
        };

        // Create a set of all schema-defined fields
        const schemaFields = new Set<string>([
            ...metadataConfig.requiredFields,
            ...metadataConfig.optionalFields,
            ...(metadataConfig.excludeFields || []),
            'name',
            'metadata'
        ]);

        // Add relationship fields to schema fields
        if (relationships) {
            Object.keys(relationships).forEach(field => schemaFields.add(field));
        }

        // Process existing metadata into the Map
        currentNode.metadata.forEach(meta => {
            const colonIndex = meta.indexOf(':');
            if (colonIndex !== -1) {
                const key = meta.substring(0, colonIndex).trim().toLowerCase();
                const value = meta.substring(colonIndex + 1).trim();
                metadata.set(key, value);
            }
        });

        // Function to update metadata entry
        const updateMetadataEntry = (key: string, value: unknown) => {
            const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
            metadata.set(key.toLowerCase(), formattedValue);
        };

        // Handle all schema-defined fields
        const allSchemaFields = [...metadataConfig.requiredFields, ...metadataConfig.optionalFields];
        for (const field of allSchemaFields) {
            if (updates[field] !== undefined && (!relationships || !relationships[field])) {
                updateMetadataEntry(field, updates[field]);
            }
        }

        // Process relationships
        if (relationships) {
            for (const [field, config] of Object.entries(relationships)) {
                if (updates[field] !== undefined) {
                    // Find existing edges for this relationship
                    const existingEdges = currentGraph.edges.filter(edge =>
                        edge.from === currentNode.name &&
                        edge.edgeType === config.edgeType
                    );

                    // Mark existing edges for removal
                    edgeChanges.remove.push(...existingEdges);

                    // Create new edges
                    const value = updates[field];
                    if (Array.isArray(value)) {
                        value.forEach((target: string) => {
                            edgeChanges.add.push({
                                type: 'edge',
                                from: currentNode.name,
                                to: target,
                                edgeType: config.edgeType
                            });
                        });
                    } else if (value) {
                        edgeChanges.add.push({
                            type: 'edge',
                            from: currentNode.name,
                            to: value as string,
                            edgeType: config.edgeType
                        });
                    }

                    // Update metadata for relationship
                    updateMetadataEntry(field, value);
                }
            }
        }

        // Process additional properties
        for (const [key, value] of Object.entries(updates)) {
            if (!schemaFields.has(key) && value !== undefined) {
                updateMetadataEntry(key, value);
            }
        }

        // Convert Map back to array format with proper capitalization
        const updatedMetadata = Array.from(metadata).map(([key, value]) => {
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
            return `${capitalizedKey}: ${value}`;
        });

        return {
            metadata: updatedMetadata,
            edgeChanges
        };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown error occurred while updating schema node');
    }
}

/**
 * Handles the complete update process for a schema-based entity.
 */
export async function handleSchemaUpdate(
    updates: NodeData,
    schema: SchemaConfig,
    nodeType: string,
    knowledgeGraphManager: KnowledgeGraphManager
): Promise<ToolResponse> {
    try {
        const result: OpenNodesResult = await knowledgeGraphManager.openNodes([updates.name]);
        const node = result.nodes.find((n: Node) => n.nodeType === nodeType);

        if (!node) {
            throw new Error(`${nodeType} "${updates.name}" not found`);
        }

        // Get relevant edges
        let relevantEdges: Edge[] = [];
        if (schema.relationships && Object.keys(schema.relationships).some(field => updates[field] !== undefined)) {
            const edgeResult: GetEdgesResult = await knowledgeGraphManager.getEdges({from: updates.name});
            relevantEdges = edgeResult.edges;
        }

        // Process updates
        const {metadata, edgeChanges} = await updateSchemaNode(
            updates,
            node,
            schema,
            {nodes: [node], edges: relevantEdges}
        );

        // Handle edge changes
        if (edgeChanges.remove.length > 0) {
            await knowledgeGraphManager.deleteEdges(edgeChanges.remove);
        }

        if (edgeChanges.add.length > 0) {
            await knowledgeGraphManager.addEdges(edgeChanges.add);
        }

        // Update the node
        const updatedNode: Node = {
            ...node,
            metadata
        };

        await knowledgeGraphManager.updateNodes([updatedNode]);

        return formatToolResponse({
            data: {updatedNodes: [updatedNode]},
            message: `Successfully updated ${nodeType} "${updatedNode.name}"`,
            actionTaken: `Updated ${nodeType} in the knowledge graph`
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return formatToolError({
            operation: 'handleSchemaUpdate',
            error: message,
            context: {updates, schema, nodeType},
            suggestions: ["Review the schema definition and the update data format", "Ensure that the node being updated exists"]
        });
    }
}

/**
 * Handles the complete delete process for a schema-based entity.
 */
export async function handleSchemaDelete(
    nodeName: string,
    nodeType: string,
    knowledgeGraphManager: KnowledgeGraphManager
): Promise<ToolResponse> {
    try {
        const graph = await knowledgeGraphManager.readGraph();
        const node = graph.nodes.find((n: Node) => n.name === nodeName && n.nodeType === nodeType);

        if (!node) {
            throw new Error(`${nodeType} "${nodeName}" not found`);
        }

        await knowledgeGraphManager.deleteNodes([nodeName]);

        return formatToolResponse({
            message: `Successfully deleted ${nodeType} "${nodeName}"`,
            actionTaken: `Deleted ${nodeType} from the knowledge graph`
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return formatToolError({
            operation: 'handleSchemaDelete',
            error: message,
            context: {nodeName, nodeType},
            suggestions: ["Ensure that the node being deleted exists"]
        });
    }
}