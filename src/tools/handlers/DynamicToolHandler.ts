// src/tools/handlers/DynamicToolHandler.ts

import {BaseToolHandler} from './BaseToolHandler.js';
import {dynamicTools} from '../tools.js';
import {formatToolResponse} from '../../utils/responseFormatter.js';
import type {ToolResponse} from '../../types/tools.js';

export class DynamicToolHandler extends BaseToolHandler {
    async handleTool(name: string, args: Record<string, any>): Promise<ToolResponse> {
        try {
            this.validateArguments(args);

            const toolResult = await dynamicTools.handleToolCall(name, args, this.knowledgeGraphManager);

            // If the result is already formatted as a ToolResponse, return it directly
            if (toolResult?.toolResult?.isError !== undefined) {
                return toolResult;
            }

            // Otherwise, format the result
            return formatToolResponse({
                data: toolResult,
                message: `Successfully executed tool: ${name}`,
                actionTaken: `Executed tool: ${name}`
            });
        } catch (error) {
            return this.handleError(name, error);
        }
    }
}