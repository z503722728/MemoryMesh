// src/tools/DynamicSchemaToolRegistry.ts

import {promises as fs} from 'fs';
import path from 'path';
import {SchemaLoader} from '../schema/loader/schemaLoader.js';
import {createSchemaNode, handleSchemaUpdate, handleSchemaDelete} from "../schema/loader/schemaProcessor.js";
import {CONFIG} from '../config/config.js';
import {formatToolResponse, formatToolError} from '../utils/responseFormatter.js';
import type {KnowledgeGraphManager} from '../types/managers.js';
import type {Tool, SchemaProperty} from '../types/tools.js';
import type {SchemaBuilder, SchemaConfig} from '../schema/loader/schemaBuilder.js';

// Define an interface for the public shape of your class
export interface IDynamicSchemaToolRegistry {
    getTools(): Tool[];

    handleToolCall(toolName: string, args: Record<string, any>, knowledgeGraphManager: KnowledgeGraphManager): Promise<any>;
}

/**
 * Manages dynamic tools generated from schema definitions.
 */
class DynamicSchemaToolRegistry implements IDynamicSchemaToolRegistry {
    /**
     * Stores schema names mapped to their SchemaBuilder instances.
     */
    private schemas: Map<string, SchemaBuilder>;

    /**
     * Caches generated tools mapped by their names.
     */
    private toolsCache: Map<string, Tool>;

    constructor() {
        this.schemas = new Map();
        this.toolsCache = new Map();
    }

    /**
     * Initializes the registry by loading all schemas and generating corresponding tools.
     */
    async initialize(): Promise<void> {
        try {
            const SCHEMAS_DIR = CONFIG.PATHS.SCHEMAS_DIR;

            // Load schema files
            const schemaFiles = await fs.readdir(SCHEMAS_DIR);

            // Process each schema file
            for (const file of schemaFiles) {
                if (file.endsWith('.schema.json')) {
                    const schemaName = path.basename(file, '.schema.json');
                    const schema = await SchemaLoader.loadSchema(schemaName);
                    this.schemas.set(schemaName, schema);
                }
            }

            // Generate tools for each schema
            for (const [schemaName, schema] of this.schemas.entries()) {
                const tools = await this.generateToolsForSchema(schemaName, schema);
                tools.forEach(tool => this.toolsCache.set(tool.name, tool));
            }

            console.error(`[DynamicSchemaTools] Initialized ${this.schemas.size} schemas and ${this.toolsCache.size} tools`);
        } catch (error) {
            console.error('[DynamicSchemaTools] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Retrieves all generated tools.
     */
    getTools(): Tool[] {
        return Array.from(this.toolsCache.values());
    }

    /**
     * Generates add, update, and delete tools for a given schema.
     */
    private async generateToolsForSchema(schemaName: string, schema: SchemaBuilder): Promise<Tool[]> {
        const tools: Tool[] = [];
        const baseSchema = schema.build();

        // Add tool
        tools.push(baseSchema as unknown as Tool);

        // Update tool
        const updateSchema = schema.createUpdateSchema();
        tools.push(updateSchema as unknown as Tool);

        // Delete tool
        const deleteSchemaProperties: Record<string, SchemaProperty> = {
            [`delete_${schemaName}`]: {
                type: "object",
                description: `Delete parameters for ${schemaName}`,
                properties: {
                    name: {
                        type: "string",
                        description: `The name of the ${schemaName} to delete`
                    }
                },
                required: ["name"]
            }
        };

        const deleteSchema: Tool = {
            name: `delete_${schemaName}`,
            description: `Delete
            an existing
            ${schemaName}
            from
            the
            knowledge
            graph`,
            inputSchema: {
                type: "object",
                properties: deleteSchemaProperties,
                required: [`delete_${schemaName}`]
            }
        };

        tools.push(deleteSchema);

        return tools;
    }

    /**
     * Handles tool calls for dynamically generated schema-based tools.
     */
    async handleToolCall(
        toolName: string,
        args: Record<string, any>,
        knowledgeGraphManager: KnowledgeGraphManager
    ): Promise<any> {
        const match = toolName.match(/^(add|update|delete)_(.+)$/);
        if (!match) {
            return formatToolError({
                operation: toolName,
                error: `Invalid tool name format: ${toolName}`,
                suggestions: ["Ensure tool name follows 'add|update|delete_<schemaName>' format"]
            });
        }

        const [, operation, schemaName] = match;
        const schemaBuilder = this.schemas.get(schemaName);

        if (!schemaBuilder) {
            return formatToolError({
                operation: toolName,
                error: `Schema not found for: ${schemaName}`,
                suggestions: [`Verify that a schema named '${schemaName}' exists`]
            });
        }

        try {
            const schema = schemaBuilder.build();

            switch (operation) {
                case 'add': {
                    const {nodes, edges} = await createSchemaNode(
                        args[schemaName],
                        schema,
                        schemaName
                    );
                    await knowledgeGraphManager.addNodes(nodes);
                    if (edges.length > 0) {
                        await knowledgeGraphManager.addEdges(edges);
                    }
                    return {nodes, edges};
                }

                case 'update': {
                    return handleSchemaUpdate(
                        args[`update_${schemaName}`],
                        schema,
                        schemaName,
                        knowledgeGraphManager
                    );
                }

                case 'delete': {
                    const {name} = args[`delete_${schemaName}`];
                    if (!name) {
                        return formatToolError({
                            operation: toolName,
                            error: `Name is required to delete a ${schemaName}`,
                            suggestions: [`Provide the 'name' of the ${schemaName} to delete`]
                        });
                    }
                    return handleSchemaDelete(name, schemaName, knowledgeGraphManager);
                }

                default:
                    return formatToolError({
                        operation: toolName,
                        error: `Unknown operation: ${operation}`,
                        suggestions: ["Supported operations are 'add', 'update', and 'delete'"]
                    });
            }
        } catch (error) {
            if (error instanceof Error) {
                return formatToolError({
                    operation: toolName,
                    error: error.message,
                    context: {args},
                    suggestions: ["Review the error message and the provided arguments"]
                });
            }
            return formatToolError({
                operation: toolName,
                error: "An unexpected error occurred",
                context: {args},
                suggestions: ["Review the provided arguments"]
            });
        }
    }
}

// Create singleton instance
const dynamicSchemaToolsInstance = new DynamicSchemaToolRegistry(); // Instantiate the class

/**
 * Initializes the dynamic tools registry.
 */
async function initializeDynamicTools(): Promise<IDynamicSchemaToolRegistry> {
    await dynamicSchemaToolsInstance.initialize(); // Call initialize on the instance
    return dynamicSchemaToolsInstance; // Return the instance
}

export {dynamicSchemaToolsInstance as dynamicSchemaTools, initializeDynamicTools};