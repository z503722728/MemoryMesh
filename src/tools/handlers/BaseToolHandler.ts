// src/tools/handlers/BaseToolHandler.ts

import type {KnowledgeGraphManager} from '../../types/managers.js';
import type {ToolResponse} from '../../types/tools.js';
import {formatToolError} from '../../utils/responseFormatter.js';

export abstract class BaseToolHandler {
    constructor(protected knowledgeGraphManager: KnowledgeGraphManager) {
    }

    abstract handleTool(name: string, args: Record<string, any>): Promise<ToolResponse>;

    protected validateArguments(args: Record<string, any>): void {
        if (!args) {
            throw new Error("Tool arguments are required");
        }
    }

    protected handleError(name: string, error: unknown): ToolResponse {
        console.error(`Error in ${name}:`, error);
        return formatToolError({
            operation: name,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            context: {toolName: name},
            suggestions: ["Examine the tool input parameters for correctness.", "Verify that the requested operation is supported."],
            recoverySteps: ["Adjust the input parameters based on the schema definition."]
        });
    }
}