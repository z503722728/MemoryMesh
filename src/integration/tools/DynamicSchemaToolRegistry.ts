// src/tools/DynamicSchemaToolRegistry.ts

import {promises as fs} from 'fs';
import path from 'path';
import {
    SchemaLoader,
    createSchemaNode,
    handleSchemaUpdate,
    handleSchemaDelete,
    type SchemaConfig
} from '@core/index.js';
import {CONFIG} from '@config/index.js';
import {formatToolResponse, formatToolError} from '@shared/index.js';
import type {ApplicationManager} from '@application/index.js';
import type {Tool, ToolResponse, ToolSchema, SchemaProperty} from '@shared/index.js';
import type {SchemaBuilder} from '@core/index.js';

// 操作类型常量
const OPERATIONS = {
    ADD: 'add',
    UPDATE: 'update',
    DELETE: 'delete'
} as const;

type OperationType = typeof OPERATIONS[keyof typeof OPERATIONS];

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

            // 过滤并处理schema文件
            const schemaPromises = schemaFiles
                .filter(file => file.endsWith('.schema.json'))
                .map(async file => {
                    const schemaName = path.basename(file, '.schema.json');
                    const schema = await SchemaLoader.loadSchema(schemaName);
                    this.schemas.set(schemaName, schema);
                    return schemaName;
                });

            // 等待所有schema加载完成
            const loadedSchemas = await Promise.all(schemaPromises);
            
            // 为每个schema生成工具
            const toolPromises = loadedSchemas.map(async schemaName => {
                const schemaBuilder = this.schemas.get(schemaName);
                if (schemaBuilder) {
                    const tools = await this.generateToolsForSchema(schemaName, schemaBuilder);
                    tools.forEach(tool => this.toolsCache.set(tool.name, tool));
                }
            });

            // 等待所有工具生成完成
            await Promise.all(toolPromises);

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
     * 生成字段描述信息
     * @param properties Schema属性对象
     * @param required 必填字段列表
     */
    private generateFieldsDescription(
        properties: Record<string, any>,
        required: string[] = []
    ): string {
        const requiredFieldsList = required.length > 0 
            ? `Required fields: ${required.join(', ')}.` 
            : '';
        
        const optionalFields = Object.keys(properties).filter(field => !required.includes(field));
        const optionalFieldsList = optionalFields.length > 0 
            ? `Optional fields: ${optionalFields.join(', ')}.` 
            : '';
        
        return [requiredFieldsList, optionalFieldsList].filter(Boolean).join(' ');
    }

    /**
     * Generates tools for a given schema
     * @param singularSchemaName The singular name of the schema (e.g., "npc")
     * @param schemaBuilder The schema builder instance
     */
    private async generateToolsForSchema(singularSchemaName: string, schemaBuilder: SchemaBuilder): Promise<Tool[]> {
        const tools: Tool[] = [];
        const singleEntitySchema = schemaBuilder.build(); // Schema for a single entity (e.g., for one NPC)

        // 提取必填和可选字段，构建更详细的描述
        const addSchemaProperties = singleEntitySchema.inputSchema.properties[singularSchemaName].properties || {};
        const requiredFields = singleEntitySchema.inputSchema.properties[singularSchemaName].required || [];
        
        // 生成字段描述信息
        const fieldsDescription = this.generateFieldsDescription(addSchemaProperties, requiredFields);

        // 1. Batch Add tool (e.g., add_npcs)
        tools.push(this.createBatchTool(
            OPERATIONS.ADD,
            singularSchemaName,
            `Add multiple new ${singularSchemaName} entities to the knowledge graph. ${fieldsDescription}`,
            singleEntitySchema.inputSchema.properties[singularSchemaName]
        ));

        // 2. Batch Update tool (e.g., update_npcs)
        const updateItemSchema = this.buildUpdateItemSchema(singularSchemaName, addSchemaProperties);
        
        tools.push(this.createBatchTool(
            OPERATIONS.UPDATE,
            singularSchemaName,
            `Update multiple existing ${singularSchemaName} entities in the knowledge graph. Provide 'name' and fields to update.`,
            updateItemSchema,
            'updates'
        ));

        // 3. Batch Delete tool (e.g., delete_npcs)
        tools.push(this.createBatchTool(
            OPERATIONS.DELETE,
            singularSchemaName,
            `Delete multiple existing ${singularSchemaName} entities from the knowledge graph by their names.`,
            { type: "string" },
            'names'
        ));

        return tools;
    }

    /**
     * 构建更新操作的item schema
     * @param singularSchemaName 实体名称（单数形式）
     * @param baseProperties 基础属性对象
     */
    private buildUpdateItemSchema(
        singularSchemaName: string, 
        baseProperties: Record<string, any>
    ): Record<string, any> {
        const updateItemProperties: Record<string, any> = {
            name: { 
                type: "string", 
                description: `The name of the ${singularSchemaName} to update (required).` 
            }
        };
        
        // 为每个属性创建可选版本
        for (const [propName, propConfig] of Object.entries(baseProperties)) {
            if (propName === 'name') continue; // 跳过name字段，已单独处理
            
            // 创建基础可选属性
            const optionalProp: Record<string, any> = {
                type: propConfig.type,
                description: propConfig.description,
            };

            // 如果有枚举值，添加到属性中
            if (propConfig.enum) {
                optionalProp.enum = propConfig.enum;
            }

            // 处理数组类型的items属性
            if (propConfig.items) {
                const itemConfig = propConfig.items;
                const isComplexItem = itemConfig.properties && Object.keys(itemConfig.properties).length > 0;

                if (isComplexItem) {
                    optionalProp.items = {
                        type: itemConfig.type || 'object',
                        description: itemConfig.description || `Complex item for ${propName}`,
                    };
                } else {
                    optionalProp.items = {
                        type: itemConfig.type || 'string',
                        description: itemConfig.description || `Item in ${propName} array`,
                    };
                    
                    // 为items添加枚举值（如果有）
                    if (itemConfig.enum) {
                        optionalProp.items.enum = itemConfig.enum;
                    }
                }
            }

            updateItemProperties[propName] = optionalProp;
        }

        // 添加专用于更新的metadata字段
        updateItemProperties['metadata'] = {
            type: "array",
            description: "Optional array of metadata strings to replace existing metadata.",
            items: { type: "string", description: "metadata string" }
        };

        return {
            type: "object",
            properties: updateItemProperties,
            required: ["name"] // 只有name是必填项，用于标识
        };
    }

    /**
     * 简化的批量工具创建函数
     * @param operation 操作类型 (add/update/delete)
     * @param entityName 实体名称（单数形式）
     * @param description 工具描述
     * @param itemSchema 数组项的schema
     * @param paramName 参数名称（默认为实体名称的复数形式）
     */
    private createBatchTool(
        operation: OperationType,
        entityName: string,
        description: string,
        itemSchema: any,
        paramName?: string
    ): Tool {
        // 确定参数名称
        const actualParamName = paramName || 
            (operation === OPERATIONS.DELETE ? 'names' : 
             operation === OPERATIONS.UPDATE ? 'updates' : `${entityName}s`);
        
        // 创建工具对象
        return {
            name: `${operation}_${entityName}s`,
            description,
            inputSchema: {
                type: "object",
                properties: {
                    [actualParamName]: {
                        type: "array",
                        description: `An array of ${entityName} ${operation === OPERATIONS.DELETE ? 'names' : 'objects'} to ${operation}.`,
                        items: itemSchema
                    }
                },
                required: [actualParamName]
            }
        };
    }

    /**
     * 从工具名称中提取操作类型和实体名称
     * @param toolName 工具名称
     */
    private parseToolName(toolName: string): { operation: OperationType; singularSchemaName: string } | null {
        const match = toolName.match(/^(add|update|delete)_(.+?)s$/);
        if (!match) return null;
        
        const [, operation, singularSchemaName] = match;
        return { 
            operation: operation as OperationType, 
            singularSchemaName 
        };
    }

    /**
     * 处理添加操作
     */
    private async handleAddOperation(
        singularSchemaName: string,
        args: Record<string, any>,
        schemaDefinition: any,
        knowledgeGraphManager: ApplicationManager
    ): Promise<ToolResponse> {
        const pluralName = `${singularSchemaName}s`;
        const itemsToAdd = args[pluralName];
        
        if (!Array.isArray(itemsToAdd) || itemsToAdd.length === 0) {
            return formatToolError({
                operation: `add_${pluralName}`,
                error: `Argument '${pluralName}' must be a non-empty array.`,
                context: { args }
            });
        }

        const allNodesToAdd = [];
        const allEdgesToAdd = [];
        const addedItemNames = [];
        const skippedItems = [];
        const failedItemsWithError: { item: string, error: string }[] = [];

        // 处理每个待添加项
        for (const itemName in itemsToAdd) {
            const itemData = itemsToAdd[itemName];
            if (!itemData || typeof itemData !== 'object') {
                console.error(`[BatchAdd] Invalid entity data:`, itemData);
                continue;
            }

            // 检查节点是否已存在
            if (itemData.name) {
                try {
                    const existingNodes = await knowledgeGraphManager.openNodes([itemData.name]);
                    if (existingNodes.nodes.length > 0) {
                        console.warn(`[BatchAdd] Node already exists and will be skipped: ${itemData.name}`);
                        skippedItems.push(itemData.name);
                        continue;
                    }
                } catch (err) {
                    console.error(`[BatchAdd] Error checking if node exists:`, err);
                    // 继续执行，假设节点不存在
                }
            }

            try {
                const { nodes, edges } = await createSchemaNode(itemData, schemaDefinition, singularSchemaName);
                allNodesToAdd.push(...nodes);
                allEdgesToAdd.push(...edges);
                addedItemNames.push(itemData.name || 'unnamed_item');
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`[BatchAdd] Error creating node for ${itemData.name || 'unnamed_item'}:`, errorMessage);
                failedItemsWithError.push({
                    item: itemData.name || `item_at_index_${itemName}`,
                    error: errorMessage
                });
            }
        }

        // 如果所有项都创建失败
        if (allNodesToAdd.length === 0 && failedItemsWithError.length > 0 && itemsToAdd.length === failedItemsWithError.length) {
            return formatToolError({
                operation: `add_${pluralName}`,
                error: `All items failed to be created due to errors. First error: ${failedItemsWithError[0].error}`,
                context: { failedItems: failedItemsWithError },
                suggestions: ["Review item data against schema requirements."]
            });
        }

        // 无新增项的情况处理 (所有项都跳过或无效且没有创建成功任何项)
        if (allNodesToAdd.length === 0) {
            return formatToolResponse({
                data: {
                    count: addedItemNames.length, 
                    names: addedItemNames,
                    skipped: skippedItems,
                    failed: failedItemsWithError
                },
                actionTaken: `Batch created ${addedItemNames.length} ${singularSchemaName}(s): ${addedItemNames.join(', ')}. Skipped: ${skippedItems.length}. Failed: ${failedItemsWithError.length}.`
            });
        }

        // 执行事务
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
                data: {
                    count: addedItemNames.length, 
                    names: addedItemNames,
                    skipped: skippedItems,
                    failed: failedItemsWithError
                },
                actionTaken: `Batch created ${addedItemNames.length} ${singularSchemaName}(s): ${addedItemNames.join(', ')}. Skipped: ${skippedItems.length}. Failed: ${failedItemsWithError.length}.`
            });
        } catch (error) {
            await knowledgeGraphManager.rollback();
            throw error;
        }
    }

    /**
     * 处理更新操作
     */
    private async handleUpdateOperation(
        singularSchemaName: string,
        args: Record<string, any>,
        originalSchemaDefinition: SchemaConfig,
        updateSchemaDefinition: SchemaConfig,
        knowledgeGraphManager: ApplicationManager
    ): Promise<ToolResponse> {
        const updatesToPerform = args['updates'];
        
        if (!Array.isArray(updatesToPerform) || updatesToPerform.length === 0) {
            return formatToolError({
                operation: `update_${singularSchemaName}s`,
                error: "Argument 'updates' must be a non-empty array.",
                context: { args }
            });
        }

        const updateResults = [];
        const updateErrors = [];

        // 处理每个更新项
        for (const updateData of updatesToPerform) {
            if (!updateData || typeof updateData !== 'object') {
                updateErrors.push({
                    item: updateData,
                    error: `Invalid update data object.`
                });
                continue;
            }

            // 确保存在name标识符
            if (!updateData.name) {
                updateErrors.push({
                    item: updateData,
                    error: `Missing 'name' for update.`
                });
                continue;
            }

            try {
                const result = await handleSchemaUpdate(
                    updateData,
                    originalSchemaDefinition,
                    singularSchemaName,
                    knowledgeGraphManager
                );
                
                if (result.toolResult?.isError) {
                    const errorMessage = this.extractErrorMessage(result.toolResult) || 
                        `Update failed for ${updateData.name}. Details unavailable.`;
                    
                    updateErrors.push({
                        item: updateData.name,
                        error: errorMessage
                    });
                } else {
                    updateResults.push(
                        result.toolResult?.actionTaken || `Updated ${updateData.name}`
                    );
                }
            } catch (e) {
                updateErrors.push({
                    item: updateData.name,
                    error: e instanceof Error ? e.message : String(e)
                });
            }
        }

        return formatToolResponse({
            data: {
                successful_updates: updateResults.length,
                failed_updates: updateErrors.length,
                details: { updated: updateResults, errors: updateErrors }
            },
            actionTaken: `Batch update for ${singularSchemaName}s processed: ${updateResults.length} successful, ${updateErrors.length} failed.`
        });
    }

    /**
     * 处理删除操作
     */
    private async handleDeleteOperation(
        singularSchemaName: string,
        args: Record<string, any>,
        knowledgeGraphManager: ApplicationManager
    ): Promise<ToolResponse> {
        const namesToDelete = args['names'];
        
        if (!Array.isArray(namesToDelete) || namesToDelete.length === 0) {
            return formatToolError({
                operation: `delete_${singularSchemaName}s`,
                error: "Argument 'names' must be a non-empty array of strings.",
                context: { args }
            });
        }

        const deletionResults = [];
        const deletionErrors = [];

        // 处理每个删除项
        for (const name of namesToDelete) {
            if (typeof name !== 'string' || !name) {
                deletionErrors.push({
                    item: name,
                    error: "Invalid name provided (must be a non-empty string)."
                });
                continue;
            }
            
            try {
                const result = await handleSchemaDelete(name, singularSchemaName, knowledgeGraphManager);
                
                if (result.toolResult?.isError) {
                    const errorMessage = this.extractErrorMessage(result.toolResult) || 
                        `Delete failed for ${name}. Details unavailable.`;
                    
                    deletionErrors.push({
                        item: name,
                        error: errorMessage
                    });
                } else {
                    deletionResults.push(
                        result.toolResult?.actionTaken || `Deleted ${name}`
                    );
                }
            } catch (e) {
                deletionErrors.push({
                    item: name,
                    error: e instanceof Error ? e.message : String(e)
                });
            }
        }

        return formatToolResponse({
            data: {
                successful_deletions: deletionResults.length,
                failed_deletions: deletionErrors.length,
                details: { deleted: deletionResults, errors: deletionErrors }
            },
            actionTaken: `Batch delete for ${singularSchemaName}s processed: ${deletionResults.length} successful, ${deletionErrors.length} failed.`
        });
    }

    /**
     * 从工具结果中提取错误消息
     * @param toolResult 工具结果对象
     */
    private extractErrorMessage(toolResult: any): string | undefined {
        if (toolResult.content && toolResult.content.length > 0) {
            const firstTextContent = toolResult.content.find((c: {type: string}) => c.type === 'text');
            if (firstTextContent && typeof firstTextContent.text === 'string') {
                return firstTextContent.text;
            }
        }
        return undefined;
    }

    /**
     * Handles tool calls for dynamically generated schema-based tools
     */
    public async handleToolCall(
        toolName: string,
        args: Record<string, any>,
        knowledgeGraphManager: ApplicationManager
    ): Promise<ToolResponse> {
        // 解析工具名称
        const parsedTool = this.parseToolName(toolName);
        
        if (!parsedTool) {
            return formatToolError({
                operation: toolName,
                error: `Invalid batch tool name format: ${toolName}`,
                suggestions: ["Tool name must follow pattern: 'add|update|delete_<schemaName>s'"]
            });
        }

        const { operation, singularSchemaName } = parsedTool;
        const schemaBuilder = this.schemas.get(singularSchemaName);

        if (!schemaBuilder) {
            return formatToolError({
                operation: toolName,
                error: `Schema not found for base name: ${singularSchemaName}`,
                context: { availableSchemas: Array.from(this.schemas.keys()) },
                suggestions: ["Verify schema name exists (e.g., 'npc' for 'add_npcs')"]
            });
        }

        try {
            const singleEntitySchemaDefinition = schemaBuilder.build(); // 用于'add'和'update'验证
            const singleUpdateSchemaDefinition = schemaBuilder.createUpdateSchema(); // 主要用于生成工具描述和结构，验证由原始 schema 处理

            // 根据操作类型分发到不同的处理函数
            switch (operation) {
                case OPERATIONS.ADD:
                    return this.handleAddOperation(
                        singularSchemaName,
                        args,
                        singleEntitySchemaDefinition,
                        knowledgeGraphManager
                    );
                
                case OPERATIONS.UPDATE:
                    return this.handleUpdateOperation(
                        singularSchemaName,
                        args,
                        singleEntitySchemaDefinition,
                        singleUpdateSchemaDefinition,
                        knowledgeGraphManager
                    );
                
                case OPERATIONS.DELETE:
                    return this.handleDeleteOperation(
                        singularSchemaName,
                        args,
                        knowledgeGraphManager
                    );
                
                default:
                    return formatToolError({
                        operation: toolName,
                        error: `Unknown operation in batch tool: ${operation}`,
                        suggestions: ["Use 'add', 'update', or 'delete' (e.g., add_npcs)"]
                    });
            }
        } catch (error) {
            // 批量操作的通用错误处理
            return formatToolError({
                operation: toolName,
                error: error instanceof Error ? error.message : 'Unknown error occurred during batch operation',
                context: { args },
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

// 创建并导出单例实例
export const dynamicSchemaTools = DynamicSchemaToolRegistry.getInstance();

/**
 * Initializes the dynamic tools registry
 */
export async function initializeDynamicTools(): Promise<IDynamicSchemaToolRegistry> {
    await dynamicSchemaTools.initialize();
    return dynamicSchemaTools;
}
