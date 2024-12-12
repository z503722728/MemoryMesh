// src/tools/DynamicSchemaToolRegistry.js
import {promises as fs} from 'fs';
import path from 'path';
import {SchemaLoader} from '../schema/loader/schemaLoader.js';
import {createSchemaNode, handleSchemaUpdate, handleSchemaDelete} from "../schema/loader/schemaProcessor.js";
import {ErrorCode, McpError} from "@modelcontextprotocol/sdk/types.js";
import {CONFIG} from '../config/config.js';
import {formatToolResponse, formatToolError} from '../utils/responseFormatter.js';

/**
 * @class DynamicSchemaToolRegistry
 * @classdesc Manages dynamic tools generated from schema definitions. Handles the initialization of schemas, generation of corresponding tools, and processing of tool calls.
 */
class DynamicSchemaToolRegistry {
    /**
     * Creates an instance of DynamicSchemaToolRegistry.
     */
    constructor() {
        /**
         * @private
         * @type {Map<string, Object>}
         * @description Stores schema names mapped to their SchemaBuilder instances.
         */
        this.schemas = new Map();
        /**
         * @private
         * @type {Map<string, Object>}
         * @description Caches generated tools mapped by their names.
         */
        this.toolsCache = new Map();
    }

    /**
     * Initializes the registry by loading all schemas and generating corresponding tools.
     * Uses the centralized configuration from CONFIG.PATHS.SCHEMAS_DIR to locate schema files.
     *
     * @returns {Promise<void>}
     * @throws {Error} If initialization fails or if schema directory cannot be accessed
     * @see {@link CONFIG} for path configurations
     */
    async initialize() {
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
     *
     * @returns {Array<Object>} - Array of tool objects.
     */
    getTools() {
        return Array.from(this.toolsCache.values());
    }

    /**
     * Generates add, update, and delete tools for a given schema.
     *
     * @param {string} schemaName - The name of the schema.
     * @param {SchemaBuilder} schema - The SchemaBuilder instance.
     * @returns {Promise<Array<Object>>} - Array of tool definitions for the schema.
     */
    async generateToolsForSchema(schemaName, schema) {
        const tools = [];
        const baseSchema = schema.build();

        // Add tool
        tools.push(baseSchema);

        // Update tool
        const updateSchema = schema.createUpdateSchema();
        tools.push(updateSchema);

        // Delete tool
        const deleteSchema = {
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
                properties: {
                    [`delete_${schemaName}`]: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                description: `The name of the ${schemaName} to delete`
                            }
                        },
                        required: ["name"]
                    }
                },
                required: [`delete_${schemaName}`]
            }
        };
        tools.push(deleteSchema);

        return tools;
    }

    /**
     * Handles tool calls for dynamically generated schema-based tools.
     *
     * @param {string} toolName - The name of the tool being called.
     * @param {Object} args - The arguments provided for the tool call.
     * @param {Object} knowledgeGraphManager - The manager instance for interacting with the knowledge graph.
     * @returns {Promise<Object>} - The result of the tool call.
     * @throws {McpError} If the tool name format is invalid or if processing the tool call fails.
     */
    async handleToolCall(toolName, args, knowledgeGraphManager) {
        const match = toolName.match(/^(add|update|delete)_(.+)$/);
        if (!match) {
            return formatToolError({
                operation: toolName,
                error: `Invalid tool name format: ${toolName}`,
                suggestions: ["Ensure tool name follows 'add|update|delete_<schemaName>' format"]
            });
        }

        const [, operation, schemaName] = match;
        const schema = this.schemas.get(schemaName);

        if (!schema) {
            return formatToolError({
                operation: toolName,
                error: `Schema not found for: ${schemaName}`,
                suggestions: [`Verify that a schema named '${schemaName}' exists`]
            });
        }

        try {
            switch (operation) {
                case 'add': {
                    const {nodes, edges} = await createSchemaNode(
                        args[schemaName],
                        schema.build(),
                        schemaName
                    );
                    await knowledgeGraphManager.addNodes(nodes);
                    await knowledgeGraphManager.addEdges(edges);
                    return formatToolResponse({
                        data: {nodes, edges},
                        message: `Successfully added ${nodes.length} node(s) and ${edges.length} edge(s) for ${schemaName}`,
                        actionTaken: `Added ${schemaName} to the knowledge graph`
                    });
                }

                case 'update': {
                    const {updatedNodes} = await handleSchemaUpdate(
                        args[`update_${schemaName}`],
                        schema.build(),
                        schemaName,
                        knowledgeGraphManager
                    );
                    return formatToolResponse({
                        data: {updatedNodes},
                        message: `Successfully updated ${schemaName}`,
                        actionTaken: `Updated ${schemaName} in the knowledge graph`
                    });
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
                    const result = await handleSchemaDelete(
                        name,
                        schemaName,
                        knowledgeGraphManager
                    );
                    return formatToolResponse({
                        data: result,
                        message: `Successfully deleted ${schemaName}: ${name}`,
                        actionTaken: `Deleted ${schemaName} from the knowledge graph`
                    });
                }

                default:
                    return formatToolError({
                        operation: toolName,
                        error: `Unknown operation: ${operation}`,
                        suggestions: ["Supported operations are 'add', 'update', and 'delete'"]
                    });
            }
        } catch (error) {
            // Catch and reformat errors thrown by createSchemaNode, handleSchemaUpdate, or handleSchemaDelete
            if (error instanceof Error) {
                return formatToolError({
                    operation: toolName,
                    error: error.message,
                    context: {input: args},
                    suggestions: ["Review the error message and the provided arguments", "Check the schema definition for required fields and types"],
                    recoverySteps: ["Modify the input to match the schema requirements", "If the error is related to data, consider correcting the data and retrying"]
                });
            } else {
                // Handle unexpected error types
                return formatToolError({
                    operation: toolName,
                    error: "An unexpected error occurred",
                    context: {input: args, errorDetails: error},
                    suggestions: ["Review the error details and the provided arguments"],
                    recoverySteps: ["If the error persists, try a generic tool"]
                });
            }
        }
    }
}

// Create singleton instance
const dynamicSchemaTools = new DynamicSchemaToolRegistry();

/**
 * Initializes the dynamic tools registry.
 *
 * @returns {Promise<DynamicSchemaToolRegistry>} - The initialized DynamicSchemaToolRegistry instance.
 */
export async function initializeDynamicTools() {
    await dynamicSchemaTools.initialize();
    return dynamicSchemaTools;
}