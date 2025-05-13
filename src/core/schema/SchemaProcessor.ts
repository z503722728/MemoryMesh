// src/schema/loader/schemaProcessor.ts

import {formatToolResponse, formatToolError, ToolResponse} from '@shared/index.js';
import type {Node, Edge, Graph, SchemaConfig} from '@core/index.js';
import type {ApplicationManager} from '@application/index.js';

interface NodeData {
    name: string;

    [key: string]: any;
}

export interface ProcessedNodeResult {
    nodes: Node[];
    edges: Edge[];
}

export interface SchemaUpdateResult {
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
        const creationErrors: string[] = []; // 用于收集创建过程中的类型错误

        // --- 从 SchemaConfig 中提取类型定义 ---
        const schemaProperties = schema.inputSchema?.properties?.[nodeType]?.properties || {};

        // --- 类型验证函数 (与 updateSchemaNode 类似) ---
        const validateType = (key: string, value: any): boolean => {
            const propertyConfig = schemaProperties[key];
            if (!propertyConfig) return true; // 如果 schema 中没有定义，则跳过验证 (允许额外字段)

            const expectedType = propertyConfig.type;
            const actualType = typeof value;

            if (expectedType === 'array') {
                if (!Array.isArray(value)) {
                    creationErrors.push(`Field "${key}" expected type "array" but received "${actualType}"`);
                    return false;
                }
                if (propertyConfig.items && propertyConfig.items.type) {
                    const expectedItemType = propertyConfig.items.type;
                    for (const item of value) {
                        if (typeof item !== expectedItemType) {
                             creationErrors.push(`Field "${key}" contains item of type "${typeof item}", expected "${expectedItemType}"`);
                             return false;
                        }
                    }
                }
            } else if (expectedType && actualType !== expectedType) {
                if (!(expectedType === 'integer' && actualType === 'number' && Number.isInteger(value))) {
                     creationErrors.push(`Field "${key}" expected type "${expectedType}" but received "${actualType}"`);
                     return false;
                }
            }
            if (propertyConfig.enum && !propertyConfig.enum.includes(value)) {
                 creationErrors.push(`Field "${key}" received value "${value}", which is not in the allowed enum list: [${propertyConfig.enum.join(', ')}]`);
                 return false;
            }
            return true;
        };
        // --- 类型验证函数结束 ---

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
                // 保持原有的必填字段检查错误
                throw new Error(`Required field "${field}" is missing`);
            }
            // 在处理前验证类型
            if (!validateType(field, data[field])) {
                continue; // 如果类型错误，记录错误并跳过此字段的处理
            }
            if (!relationships || !relationships[field]) {
                metadata.push(formatMetadataEntry(field, data[field]));
            }
        }

        // Process optional fields
        for (const field of metadataConfig.optionalFields) {
            if (data[field] !== undefined) {
                // 在处理前验证类型
                if (!validateType(field, data[field])) {
                    continue; // 如果类型错误，记录错误并跳过此字段的处理
                }
                if (!relationships || !relationships[field]) {
                    metadata.push(formatMetadataEntry(field, data[field]));
                }
            }
        }

        // Process relationships
        if (relationships) {
            for (const [field, config] of Object.entries(relationships)) {
                if (data[field]) {
                    // 在处理前验证类型 (关系字段通常是 string 或 string[])
                    if (!validateType(field, data[field])) {
                        continue; // 如果类型错误，记录错误并跳过此关系字段的处理
                    }
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
                 // 对于未在 schema 中定义的字段，不进行类型验证，直接添加
                 // 如果希望严格执行 schema，可以在这里阻止或记录未知字段
                metadata.push(formatMetadataEntry(key, value));
            }
        }

        // 如果在验证过程中收集到错误，抛出错误中断创建
        if (creationErrors.length > 0) {
            throw new Error(`Schema validation failed during creation for "${data.name}": ${creationErrors.join('; ')}`);
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
    originalSchema: SchemaConfig,
    currentGraph: Graph,
    nodeType: string
): Promise<SchemaUpdateResult> {
    const {metadataConfig, relationships} = originalSchema;
    const metadata = new Map<string, string>();
    const edgeChanges = {
        remove: [] as Edge[],
        add: [] as Edge[]
    };
    const updateErrors: string[] = []; // 用于收集类型错误信息

    // --- 从 SchemaConfig 中提取类型定义 ---
    const schemaProperties = originalSchema.inputSchema?.properties?.[nodeType]?.properties || {};

    // --- 类型验证函数 ---
    const validateType = (key: string, value: any): boolean => {
        const propertyConfig = schemaProperties[key];
        if (!propertyConfig) return true; // 如果 schema 中没有定义，则跳过验证 (允许额外字段)

        const expectedType = propertyConfig.type;
        const actualType = typeof value;

        if (expectedType === 'array') {
            if (!Array.isArray(value)) {
                updateErrors.push(`Field "${key}" expected type "array" but received "${actualType}"`);
                return false;
            }
            // 可选：添加对数组元素类型的检查
            if (propertyConfig.items && propertyConfig.items.type) {
                const expectedItemType = propertyConfig.items.type;
                for (const item of value) {
                    if (typeof item !== expectedItemType) {
                         updateErrors.push(`Field "${key}" contains item of type "${typeof item}", expected "${expectedItemType}"`);
                         return false; // 或者只记录错误，不阻止更新？取决于策略
                    }
                }
            }
        } else if (expectedType && actualType !== expectedType) {
            // 基础类型检查 (string, number, boolean, object)
            // 注意：JSON schema 类型系统和 JS typeof 不完全一致，这里是简化处理
            if (!(expectedType === 'integer' && actualType === 'number' && Number.isInteger(value))) {
                 updateErrors.push(`Field "${key}" expected type "${expectedType}" but received "${actualType}"`);
                 return false;
            }
        }
        // 可选：添加对 enum 的检查
        if (propertyConfig.enum && !propertyConfig.enum.includes(value)) {
             updateErrors.push(`Field "${key}" received value "${value}", which is not in the allowed enum list: [${propertyConfig.enum.join(', ')}]`);
             return false;
        }

        return true;
    };
    // --- 类型验证函数结束 ---

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
        // 在更新前进行类型验证
        if (!validateType(key, value)) {
            // 如果验证失败，可以选择跳过该字段的更新，或者抛出错误
            console.warn(`[SchemaProcessor] Type validation failed for field "${key}". Skipping update for this field.`);
            return; // 跳过此字段的更新
        }
        const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
        metadata.set(key.toLowerCase(), formattedValue);
    };

    // Process standard metadata fields
    const allSchemaFields = [...metadataConfig.requiredFields, ...metadataConfig.optionalFields];
    for (const field of allSchemaFields) {
        if (updates[field] !== undefined && (!relationships || !relationships[field])) {
            updateMetadataEntry(field, updates[field]);
        }
    }

    // Process relationships if they exist in the schema
    if (relationships) {
        for (const [field, config] of Object.entries(relationships)) {
            // Only process relationship if it's being updated
            if (updates[field] !== undefined) {
                 // 在更新前进行类型验证 (关系字段通常是 string 或 string[])
                 if (!validateType(field, updates[field])) {
                     console.warn(`[SchemaProcessor] Type validation failed for relationship field "${field}". Skipping update.`);
                     continue; // 跳过此关系字段的更新
                 }

                // Get all existing edges for this relationship type from this node
                const existingEdges = currentGraph.edges.filter(edge =>
                    edge.from === currentNode.name &&
                    edge.edgeType === config.edgeType
                );

                // Only mark edges for removal if they're part of this relationship type
                edgeChanges.remove.push(...existingEdges);

                // Add new edges
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

    // Process additional fields not defined in schema
    for (const [key, value] of Object.entries(updates)) {
        if (!schemaFields.has(key) && value !== undefined) {
            // 对于未在 schema 中定义的字段，不进行类型验证，直接更新
            const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
            metadata.set(key.toLowerCase(), formattedValue);
            // 或者，如果希望严格执行 schema，可以在这里阻止未知字段的添加
            // updateErrors.push(`Field "${key}" is not defined in the schema.`);
        }
    }

    // 如果在验证过程中收集到错误，可以选择如何处理
    if (updateErrors.length > 0) {
        // 方案1：抛出错误，中断整个更新操作
        throw new Error(`Schema validation failed during update: ${updateErrors.join('; ')}`);
        // 方案2：返回包含错误信息的特定结果，让调用者决定如何处理
        // return { metadata: [], edgeChanges, errors: updateErrors }; // 需要调整函数签名和返回值类型
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
    originalSchema: SchemaConfig,
    nodeType: string,
    applicationManager: ApplicationManager
): Promise<ToolResponse> {
    try {
        // Start a transaction to ensure atomic updates
        await applicationManager.beginTransaction();

        // Get the complete current state
        const fullGraph = await applicationManager.readGraph();
        const node = fullGraph.nodes.find((n: Node) => n.nodeType === nodeType && n.name === updates.name);

        if (!node) {
            await applicationManager.rollback();
            return formatToolError({
                operation: 'updateSchema',
                error: `${nodeType} "${updates.name}" not found`,
                context: {updates, nodeType},
                suggestions: ["Verify the node exists", "Check node type matches"]
            });
        }

        try {
            // Process updates
            const result = await updateSchemaNode(
                updates,
                node,
                originalSchema,
                fullGraph,
                nodeType
            );

            // // 如果 updateSchemaNode 返回了错误信息 (需要修改 updateSchemaNode 的返回类型)
            // if (result.errors && result.errors.length > 0) {
            //     await applicationManager.rollback();
            //     return formatToolError({
            //         operation: 'updateSchema',
            //         error: `Schema validation failed: ${result.errors.join('; ')}`,
            //         context: { updates },
            //         suggestions: ["Correct the data types according to the schema."]
            //     });
            // }
             // 因为 updateSchemaNode 现在在验证失败时抛出错误，这里可以直接捕获
             const { metadata, edgeChanges } = result;

            // --- 注册回滚动作 ---
            await applicationManager.addRollbackAction(
                async () => {
                    // 恢复原节点
                    await applicationManager.updateNodes([node]);
                    // 恢复被删除的边
                    if (edgeChanges.remove.length > 0) {
                        await applicationManager.addEdges(edgeChanges.remove);
                    }
                    // 删除新加的边
                    if (edgeChanges.add.length > 0) {
                        await applicationManager.deleteEdges(edgeChanges.add);
                    }
                },
                `Rollback: 恢复节点${node.name}及其边`
            );
            // --- 回滚动作注册结束 ---

            // Update the node first
            const updatedNode: Node = {
                ...node,
                metadata
            };
            await applicationManager.updateNodes([updatedNode]);

            // Then handle edges if there are any changes
            if (edgeChanges.remove.length > 0) {
                await applicationManager.deleteEdges(edgeChanges.remove);
            }

            if (edgeChanges.add.length > 0) {
                await applicationManager.addEdges(edgeChanges.add);
            }

            // If everything succeeded, commit the transaction
            await applicationManager.commit();

            return formatToolResponse({
                data: {
                    updatedNode,
                    edgeChanges
                },
                actionTaken: `Updated ${nodeType}: ${updatedNode.name}`
            });

        } catch (error) {
            // If anything fails, rollback all changes
            await applicationManager.rollback();
            // 将捕获的错误传递给 formatToolError
            return formatToolError({
                operation: 'updateSchema',
                error: error instanceof Error ? error.message : 'Unknown error during update processing',
                context: { updates, nodeType },
                suggestions: ["Review error details", "Check input data against schema"]
            });
        }

    } catch (error) {
        if (applicationManager.isInTransaction()) {
            await applicationManager.rollback();
        }

        return formatToolError({
            operation: 'updateSchema',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            context: {updates, nodeType},
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
    applicationManager: ApplicationManager
): Promise<ToolResponse> {
    try {
        const graph = await applicationManager.readGraph();
        const node = graph.nodes.find((n: Node) => n.name === nodeName && n.nodeType === nodeType);

        if (!node) {
            return formatToolError({
                operation: 'deleteSchema',
                error: `${nodeType} "${nodeName}" not found`,
                context: {nodeName, nodeType},
                suggestions: ["Verify node name and type"]
            });
        }

        await applicationManager.deleteNodes([nodeName]);

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