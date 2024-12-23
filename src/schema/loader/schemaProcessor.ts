// src/schema/loader/schemaProcessor.ts

import {formatToolResponse, formatToolError} from '../../utils/responseFormatter.js';
import type {Node, Edge, Graph} from '../../types/graph.js';
import type {ToolResponse} from '../../types/tools.js';
import type {KnowledgeGraphManager} from '../../core/KnowledgeGraphManager.js';
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

        // Create excluded fields set
        const excludedFields = new Set<string>([
            'name',
            ...metadataConfig.requiredFields,
            ...metadataConfig.optionalFields,
            ...(metadataConfig.excludeFields || []),
        ]);

        if (relationships) {
            Object.keys(relationships).forEach(field => excludedFields.add(field));
        }

        // Process required fields
        for (const field of metadataConfig.requiredFields) {
            if (data[field] === undefined) {
                throw new Error(`Required field "${field}" is missing`);
            }
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
                        for (const target of value) {
                            edges.push({
                                type: 'edge',
                                from: data.name,
                                to: target,
                                edgeType: config.edgeType
                            });
                        }
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

        // Process additional fields
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
        throw error;
    }
}

export async function updateSchemaNode(
    updates: NodeData,
    currentNode: Node,
    schema: SchemaConfig,
    currentGraph: Graph
): Promise<SchemaUpdateResult> {
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

    const updateMetadataEntry = (key: string, value: unknown) => {
        const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
        metadata.set(key.toLowerCase(), formattedValue);
    };

    const allSchemaFields = [...metadataConfig.requiredFields, ...metadataConfig.optionalFields];
    for (const field of allSchemaFields) {
        if (updates[field] !== undefined && (!relationships || !relationships[field])) {
            updateMetadataEntry(field, updates[field]);
        }
    }

    if (relationships) {
        for (const [field, config] of Object.entries(relationships)) {
            if (updates[field] !== undefined) {
                const existingEdges = currentGraph.edges.filter(edge =>
                    edge.from === currentNode.name &&
                    edge.edgeType === config.edgeType
                );

                edgeChanges.remove.push(...existingEdges);

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

                updateMetadataEntry(field, value);
            }
        }
    }

    for (const [key, value] of Object.entries(updates)) {
        if (!schemaFields.has(key) && value !== undefined) {
            updateMetadataEntry(key, value);
        }
    }

    const updatedMetadata = Array.from(metadata).map(([key, value]) => {
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        return `${capitalizedKey}: ${value}`;
    });

    return {
        metadata: updatedMetadata,
        edgeChanges
    };
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
        const result = await knowledgeGraphManager.openNodes([updates.name]);
        const node = result.nodes.find((n: Node) => n.nodeType === nodeType);

        if (!node) {
            return formatToolError({
                operation: 'updateSchema',
                error: `${nodeType} "${updates.name}" not found`,
                context: {updates, nodeType},
                suggestions: ["Verify the node exists", "Check node type matches"]
            });
        }

        // Get relevant edges
        let relevantEdges: Edge[] = [];
        if (schema.relationships && Object.keys(schema.relationships).some(field => updates[field] !== undefined)) {
            const edgeResult = await knowledgeGraphManager.getEdges({from: updates.name});
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

        const updatedNode: Node = {
            ...node,
            metadata
        };

        await knowledgeGraphManager.updateNodes([updatedNode]);

        return formatToolResponse({
            data: {updatedNode},
            actionTaken: `Updated ${nodeType}: ${updatedNode.name}`
        });
    } catch (error) {
        return formatToolError({
            operation: 'updateSchema',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            context: {updates, schema, nodeType},
            suggestions: [
                "Check all required fields are provided",
                "Verify relationship targets exist"
            ],
            recoverySteps: [
                "Review schema requirements",
                "Ensure node exists before updating"
            ]
        });
    }
}

export async function handleSchemaDelete(
    nodeName: string,
    nodeType: string,
    knowledgeGraphManager: KnowledgeGraphManager
): Promise<ToolResponse> {
    try {
        const graph = await knowledgeGraphManager.readGraph();
        const node = graph.nodes.find((n: Node) => n.name === nodeName && n.nodeType === nodeType);

        if (!node) {
            return formatToolError({
                operation: 'deleteSchema',
                error: `${nodeType} "${nodeName}" not found`,
                context: {nodeName, nodeType},
                suggestions: ["Verify node name and type"]
            });
        }

        await knowledgeGraphManager.deleteNodes([nodeName]);

        return formatToolResponse({
            actionTaken: `Deleted ${nodeType}: ${nodeName}`
        });
    } catch (error) {
        return formatToolError({
            operation: 'deleteSchema',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            context: {nodeName, nodeType},
            suggestions: [
                "Check node exists",
                "Verify delete permissions"
            ],
            recoverySteps: [
                "Ensure no dependent nodes exist",
                "Try retrieving node first"
            ]
        });
    }
}