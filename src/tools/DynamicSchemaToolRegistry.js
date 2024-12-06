// src/tools/DynamicSchemaToolRegistry.js
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {SchemaLoader} from '../schema/loader/schemaLoader.js';
import {createSchemaNode, handleSchemaUpdate, handleSchemaDelete} from "../schema/loader/schemaProcessor.js";
import {ErrorCode, McpError} from "@modelcontextprotocol/sdk/types.js";

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
     *
     * @returns {Promise<void>}
     * @throws {Error} If initialization fails.
     */
    async initialize() {
        try {
            // Define __dirname for ES modules
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const SCHEMAS_DIR = path.join(__dirname, '..', '..', 'src', 'config', 'schemas');

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
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Invalid tool name format: ${toolName}`
            );
        }

        const [, operation, schemaName] = match;
        const schema = this.schemas.get(schemaName);

        if (!schema) {
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Schema not found for: ${schemaName}`
            );
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
                    return {toolResult: {nodes, edges}};
                }

                case 'update': {
                    const {updatedNodes} = await handleSchemaUpdate(
                        args[`update_${schemaName}`],
                        schema.build(),
                        schemaName,
                        knowledgeGraphManager
                    );
                    return {toolResult: {updatedNodes}};
                }

                case 'delete': {
                    const {name} = args[`delete_${schemaName}`];
                    if (!name) {
                        throw new McpError(
                            ErrorCode.InvalidParams,
                            `Name is required to delete a ${schemaName}`
                        );
                    }
                    const result = await handleSchemaDelete(
                        name,
                        schemaName,
                        knowledgeGraphManager
                    );
                    return {toolResult: result};
                }

                default:
                    throw new McpError(
                        ErrorCode.MethodNotFound,
                        `Unknown operation: ${operation}`
                    );
            }
        } catch (error) {
            // If it's already an MCP error, rethrow it
            if (error instanceof McpError) {
                throw error;
            }
            // Otherwise, wrap it in an MCP error
            throw new McpError(
                ErrorCode.InternalError,
                `Error processing tool call: ${error.message}`
            );
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
