// src/tools/DynamicSchemaToolRegistry.ts

import {promises as fs} from 'fs';
import path from 'path';
import {
    SchemaLoader,
    createSchemaNode,
    handleSchemaUpdate,
    handleSchemaDelete
} from '@core/index.js';
import {CONFIG} from '@config/index.js';
import {formatToolResponse, formatToolError} from '@shared/index.js';
import type {ApplicationManager} from '@application/index.js';
import type {Tool, ToolResponse} from '@shared/index.js';
import type {SchemaBuilder} from '@core/index.js';

/**
 * Interface defining the public contract for dynamic schema tool registry
 */
export interface IDynamicSchemaToolRegistry {
    getTools(): Tool[];
    handleToolCall(toolName: string, args: Record<string, any>, knowledgeGraphManager: ApplicationManager): Promise<ToolResponse>;
}

/**
 * Manages dynamic tools generated from schema definitions
 */
class DynamicSchemaToolRegistry implements IDynamicSchemaToolRegistry {
    private schemas: Map<string, SchemaBuilder>;
    private toolsCache: Map<string, Tool>;
    private static instance: DynamicSchemaToolRegistry;

    private constructor() {
        this.schemas = new Map();
        this.toolsCache = new Map();
    }

    /**
     * Gets the singleton instance
     */
    public static getInstance(): DynamicSchemaToolRegistry {
        if (!DynamicSchemaToolRegistry.instance) {
            DynamicSchemaToolRegistry.instance = new DynamicSchemaToolRegistry();
        }
        return DynamicSchemaToolRegistry.instance;
    }

    /**
     * Initializes the registry by loading schemas and generating tools
     */
    public async initialize(): Promise<void> {
        try {
            const SCHEMAS_DIR = CONFIG.PATHS.SCHEMAS_DIR;
            const schemaFiles = await fs.readdir(SCHEMAS_DIR);

            // Process schema files
            for (const file of schemaFiles) {
                if (file.endsWith('.schema.json')) {
                    // schemaName should be singular, e.g., 'npc' from 'npc.schema.json'
                    const schemaName = path.basename(file, '.schema.json');
                    const schema = await SchemaLoader.loadSchema(schemaName);
                    this.schemas.set(schemaName, schema);
                }
            }

            // Generate tools for each schema
            for (const [schemaName, schemaBuilder] of this.schemas.entries()) {
                // schemaName here is singular (e.g., "npc")
                const tools = await this.generateToolsForSchema(schemaName, schemaBuilder);
                tools.forEach(tool => this.toolsCache.set(tool.name, tool));
            }

            console.error(`[DynamicSchemaTools] Initialized ${this.schemas.size} schemas and ${this.toolsCache.size} tools`);
        } catch (error) {
            console.error('[DynamicSchemaTools] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Retrieves all generated tools
     */
    public getTools(): Tool[] {
        return Array.from(this.toolsCache.values());
    }

    /**
     * Generates tools for a given schema
     * @param singularSchemaName The singular name of the schema (e.g., "npc")
     * @param schemaBuilder The schema builder instance
     */
    private async generateToolsForSchema(singularSchemaName: string, schemaBuilder: SchemaBuilder): Promise<Tool[]> {
        const tools: Tool[] = [];
        const singleEntitySchema = schemaBuilder.build(); // Schema for a single entity (e.g., for one NPC)

        // 1. Batch Add tool (e.g., add_npcs)
        tools.push({
            name: `add_${singularSchemaName}s`, // Pluralized tool name
            description: `Add multiple new ${singularSchemaName} entities to the knowledge graph`,
            inputSchema: {
                type: "object",
                properties: {
                    [`${singularSchemaName}s`]: { // Parameter name is pluralized schemaName, e.g., "npcs"
                        type: "array",
                        description: `An array of ${singularSchemaName} objects to add.`,
                        items: singleEntitySchema.inputSchema // Each item in array uses the original single entity schema
                    }
                },
                required: [`${singularSchemaName}s`]
            }
        } as unknown as Tool);

        // 2. Batch Update tool (e.g., update_npcs)
        const singleUpdateOperationSchema = schemaBuilder.createUpdateSchema(); // Schema for updating one item
        tools.push({
            name: `update_${singularSchemaName}s`, // Pluralized tool name
            description: `Update multiple existing ${singularSchemaName} entities in the knowledge graph.`,
            inputSchema: {
                type: "object",
                properties: {
                    updates: { // A generic name for the array of update objects
                        type: "array",
                        description: `An array of ${singularSchemaName} update objects. Each object must contain an identifier (e.g., 'name') and the fields to update.`,
                        items: singleUpdateOperationSchema.inputSchema // Each item uses the single update operation schema
                    }
                },
                required: ["updates"]
            }
        } as unknown as Tool);

        // 3. Batch Delete tool (e.g., delete_npcs)
        tools.push({
            name: `delete_${singularSchemaName}s`, // Pluralized tool name
            description: `Delete multiple existing ${singularSchemaName} entities from the knowledge graph by their names.`,
            inputSchema: {
                type: "object",
                properties: {
                    names: { // Expect an array of names
                        type: "array",
                        description: `An array of ${singularSchemaName} names to delete.`,
                        items: {
                            type: "string"
                        }
                    }
                },
                required: ["names"]
            }
        } as unknown as Tool);

        return tools;
    }

    /**
     * Handles tool calls for dynamically generated schema-based tools
     */
    public async handleToolCall(
        toolName: string,
        args: Record<string, any>,
        knowledgeGraphManager: ApplicationManager
    ): Promise<ToolResponse> {
        // Regex to capture operation (add, update, delete) and singular schema name
        // e.g., "add_npcs" -> op: "add", singularSchemaName: "npc"
        const match = toolName.match(/^(add|update|delete)_(.+?)s$/); // Non-greedy match for schema name part, ends with 's'

        if (!match) {
            // This case should ideally not be hit if ToolHandlerFactory routes correctly
            // based on pluralized names from toolsRegistry
            return formatToolError({
                operation: toolName,
                error: `Invalid batch tool name format: ${toolName}`,
                suggestions: ["Tool name must follow pattern: 'add|update|delete_<schemaName>s'"]
            });
        }

        const [, operation, singularSchemaName] = match; // singularSchemaName is e.g., "npc"
        const schemaBuilder = this.schemas.get(singularSchemaName); // Use singular name to find schema builder

        if (!schemaBuilder) {
            return formatToolError({
                operation: toolName,
                error: `Schema not found for base name: ${singularSchemaName}`,
                context: {availableSchemas: Array.from(this.schemas.keys())},
                suggestions: ["Verify schema name exists (e.g., 'npc' for 'add_npcs')"]
            });
        }

        try {
            const singleEntitySchemaDefinition = schemaBuilder.build(); // For 'add' item validation
            const singleUpdateSchemaDefinition = schemaBuilder.createUpdateSchema(); // For 'update' item validation/structure

            switch (operation) {
                case 'add': {
                    const itemsToAdd = args[`${singularSchemaName}s`]; // e.g., args['npcs']
                    if (!Array.isArray(itemsToAdd) || itemsToAdd.length === 0) {
                        return formatToolError({
                            operation: toolName,
                            error: `Argument '${singularSchemaName}s' must be a non-empty array.`,
                            context: {args}
                        });
                    }

                    const allNodesToAdd = [];
                    const allEdgesToAdd = [];
                    const addedItemNames = [];

                    for (const itemData of itemsToAdd) {
                        // Optional: Add individual item validation against singleEntitySchemaDefinition.inputSchema if needed
                        // const validationError = validate(itemData, singleEntitySchemaDefinition.inputSchema); if(validationError) ...

                        // Extract actual entity data, assuming it's nested under a key like 'location' (singularSchemaName)
                        const actualEntityData = itemData[singularSchemaName];

                        if (!actualEntityData || typeof actualEntityData !== 'object') {
                            console.error(`[BatchAdd] Invalid or missing nested entity data for key '${singularSchemaName}' in item:`, itemData);
                            // Potentially add to an errors list and continue to the next item
                            // For now, we'll skip this item if the expected nested structure isn't found.
                            continue;
                        }

                        // Check for existing node before creating, using the name from actualEntityData
                        if (actualEntityData.name) {
                            const existingNodes = await knowledgeGraphManager.openNodes([actualEntityData.name]);
                            if (existingNodes.nodes.length > 0) {
                                // Decide error handling: fail whole batch, or skip and report, or overwrite (not implemented here)
                                console.warn(`[BatchAdd] Node already exists and will be skipped: ${actualEntityData.name}`);
                                // Or: throw new Error(`Node already exists in batch: ${actualEntityData.name}`);
                                continue; // Skip this item
                            }
                        }
                        // Use actualEntityData when calling createSchemaNode
                        const {nodes, edges} = await createSchemaNode(actualEntityData, singleEntitySchemaDefinition, singularSchemaName);
                        allNodesToAdd.push(...nodes);
                        allEdgesToAdd.push(...edges);
                        // Use actualEntityData.name for addedItemNames
                        addedItemNames.push(actualEntityData.name || 'unnamed_item');
                    }

                    if (allNodesToAdd.length === 0 && allEdgesToAdd.length === 0 && addedItemNames.length > 0) {
                         return formatToolResponse({
                            data: {count: 0, names: addedItemNames, message: "No new items were added (all items might have existed and were skipped)."},
                            actionTaken: `Batch add for ${singularSchemaName}s processed; no new items added.`
                        });
                    }
                     if (allNodesToAdd.length === 0 && allEdgesToAdd.length === 0 && addedItemNames.length === 0) {
                         return formatToolResponse({
                            data: {count: 0, message: "No items to add or all items were invalid."},
                            actionTaken: `Batch add for ${singularSchemaName}s processed; no items to add.`
                        });
                    }


                    await knowledgeGraphManager.beginTransaction();
                    try {
                        if (allNodesToAdd.length > 0) {
                            await knowledgeGraphManager.addNodes(allNodesToAdd);
                            // 注册批量回滚动作
                            const nodeNames = allNodesToAdd.map(node => node.name);
                            await knowledgeGraphManager.addRollbackAction(
                                async () => {
                                    await knowledgeGraphManager.deleteNodes(nodeNames);
                                },
                                `Rollback: 批量删除节点 ${nodeNames.join(', ')}`
                            );
                        }
                        if (allEdgesToAdd.length > 0) {
                            await knowledgeGraphManager.addEdges(allEdgesToAdd);
                        }
                        await knowledgeGraphManager.commit();

                        return formatToolResponse({
                            data: {count: addedItemNames.length, names: addedItemNames},
                            actionTaken: `Batch created ${addedItemNames.length} ${singularSchemaName}(s): ${addedItemNames.join(', ')}`
                        });
                    } catch (error) {
                        await knowledgeGraphManager.rollback();
                        throw error; // Re-throw to be caught by outer try-catch
                    }
                }

                case 'update': {
                    const updatesToPerform = args['updates']; // Expecting an array of update objects
                    if (!Array.isArray(updatesToPerform) || updatesToPerform.length === 0) {
                        return formatToolError({
                            operation: toolName,
                            error: "Argument 'updates' must be a non-empty array.",
                            context: {args}
                        });
                    }

                    const updateResults = [];
                    const updateErrors = [];

                    for (const updateItemContainer of updatesToPerform) { // Renamed for clarity
                        // The actual update data (including name and fields to change) is nested.
                        // The key for this nesting is `update_${singularSchemaName}` based on typical Python tool structure,
                        // or simply `singularSchemaName` if the update tool schema directly uses that.
                        // Given the Python tools often have a structure like `updates: [{ "update_entity": { ... } }]`,
                        // we should try to find the relevant nested object.
                        // Let's assume the key is `singularSchemaName` or `update_${singularSchemaName}` from the args structure.
                        // For `mcp_memorymesh_update_locations`, args.updates is an array of `McpMemorymeshUpdateLocationsUpdates`,
                        // and each of those has an `update_location` field of type `McpMemorymeshUpdateLocationsUpdatesUpdateLocation`.
                        // So, `singularSchemaName` is 'location'. The key in `updateItemContainer` is `update_location`.

                        const actualUpdateData = updateItemContainer[`update_${singularSchemaName}`]; // e.g., updateItemContainer['update_location']

                        if (!actualUpdateData || typeof actualUpdateData !== 'object') {
                            updateErrors.push({item: updateItemContainer, error: `Invalid or missing nested update data object under key 'update_${singularSchemaName}'.`});
                            continue;
                        }

                        // Ensure 'name' or identifier is present in actualUpdateData
                        if (!actualUpdateData.name) {
                            updateErrors.push({item: actualUpdateData, error: `Missing 'name' for update within the nested update data.`});
                            continue;
                        }

                        try {
                            // Pass actualUpdateData to handleSchemaUpdate
                            const result = await handleSchemaUpdate(
                                actualUpdateData, // This contains the identifier (e.g. name) and fields to update
                                singleUpdateSchemaDefinition, // Pass the schema for a single update operation
                                singularSchemaName,
                                knowledgeGraphManager
                            );
                            if (result.toolResult?.isError) {
                                let extractedErrorMessage: string | undefined;
                                if (result.toolResult.content && result.toolResult.content.length > 0) {
                                    const firstTextContent = result.toolResult.content.find(c => c.type === 'text');
                                    if (firstTextContent && typeof firstTextContent.text === 'string') {
                                        extractedErrorMessage = firstTextContent.text;
                                    }
                                }
                                const errorMessage = extractedErrorMessage || `Update failed for ${actualUpdateData.name}. Details unavailable.`;
                                updateErrors.push({item: actualUpdateData.name, error: errorMessage});
                            } else {
                                updateResults.push(result.toolResult?.actionTaken || `Updated ${actualUpdateData.name}`);
                            }
                        } catch (e) {
                             updateErrors.push({item: actualUpdateData.name, error: e instanceof Error ? e.message: String(e) });
                        }
                    }

                    return formatToolResponse({
                        data: {
                            successful_updates: updateResults.length,
                            failed_updates: updateErrors.length,
                            details: {updated: updateResults, errors: updateErrors}
                        },
                        actionTaken: `Batch update for ${singularSchemaName}s processed.`                    });
                }

                case 'delete': {
                    const namesToDelete = args['names']; // Expecting an array of names
                    if (!Array.isArray(namesToDelete) || namesToDelete.length === 0) {
                        return formatToolError({
                            operation: toolName,
                            error: "Argument 'names' must be a non-empty array of strings.",
                            context: {args}
                        });
                    }

                    const deletionResults = [];
                    const deletionErrors = [];

                    for (const name of namesToDelete) {
                        if (typeof name !== 'string' || !name) {
                            deletionErrors.push({item: name, error: "Invalid name provided (must be a non-empty string)." });
                            continue;
                        }
                        try {
                            const result = await handleSchemaDelete(name, singularSchemaName, knowledgeGraphManager);
                            if (result.toolResult?.isError) {
                                let extractedErrorMessage: string | undefined;
                                if (result.toolResult.content && result.toolResult.content.length > 0) {
                                    const firstTextContent = result.toolResult.content.find(c => c.type === 'text');
                                    if (firstTextContent && typeof firstTextContent.text === 'string') {
                                        extractedErrorMessage = firstTextContent.text;
                                    }
                                }
                                const errorMessage = extractedErrorMessage || `Delete failed for ${name}. Details unavailable.`;
                                deletionErrors.push({item: name, error: errorMessage});
                            } else {
                                deletionResults.push(result.toolResult?.actionTaken || `Deleted ${name}`);
                            }
                        } catch (e) {
                            deletionErrors.push({item: name, error: e instanceof Error ? e.message: String(e) });
                        }
                    }

                    return formatToolResponse({
                         data: {
                            successful_deletions: deletionResults.length,
                            failed_deletions: deletionErrors.length,
                            details: {deleted: deletionResults, errors: deletionErrors}
                        },
                        actionTaken: `Batch delete for ${singularSchemaName}s processed.`
                    });
                }

                default: // Should not be reached due to the regex match and factory routing
                    return formatToolError({
                        operation: toolName,
                        error: `Unknown operation in batch tool: ${operation}`,
                        suggestions: ["Use 'add', 'update', or 'delete' (e.g., add_npcs)"]
                    });
            }
        } catch (error) {
            // General error handling for the entire batch operation
            return formatToolError({
                operation: toolName,
                error: error instanceof Error ? error.message : 'Unknown error occurred during batch operation',
                context: {args},
                suggestions: [
                    "Check input parameters against batch schema requirements",
                    "Verify individual item data and identifiers"
                ],
                recoverySteps: [
                    "Review schema requirements for batch operations",
                    "Ensure all array items are correctly formatted and valid"
                ]
            });
        }
    }
}

// Create and export singleton instance
export const dynamicSchemaTools = DynamicSchemaToolRegistry.getInstance();

/**
 * Initializes the dynamic tools registry
 */
export async function initializeDynamicTools(): Promise<IDynamicSchemaToolRegistry> {
    await dynamicSchemaTools.initialize();
    return dynamicSchemaTools;
}
