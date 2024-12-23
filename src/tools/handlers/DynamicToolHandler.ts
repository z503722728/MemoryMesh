// src/tools/handlers/DynamicToolHandler.ts

import {BaseToolHandler} from './BaseToolHandler.js';
import {dynamicToolManager} from '../registry/dynamicTools.js';
import {formatToolResponse, formatToolError} from '../../utils/responseFormatter.js';
import type {ToolResponse} from '../../types/tools.js';

export class DynamicToolHandler extends BaseToolHandler {
    async handleTool(name: string, args: Record<string, any>): Promise<ToolResponse> {
        try {
            this.validateArguments(args);

            const toolResult = await dynamicToolManager.handleToolCall(name, args, this.knowledgeGraphManager);

            if (toolResult?.toolResult?.isError !== undefined) {
                return toolResult;
            }

            return formatToolResponse({
                data: toolResult,
                actionTaken: `Executed dynamic tool: ${name}`
            });
        } catch (error) {
            return formatToolError({
                operation: name,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                context: {toolName: name, args},
                suggestions: [
                    "Examine the tool input parameters for correctness",
                    "Verify that the requested operation is supported"
                ],
                recoverySteps: [
                    "Adjust the input parameters based on the schema definition"
                ]
            });
        }
    }
}