// src/tools/callToolHandler.ts

import {ToolHandlerFactory} from './handlers/ToolHandlerFactory.js';
import {toolsRegistry} from './registry/toolsRegistry.js';
import {formatToolError} from '../utils/responseFormatter.js';
import type {KnowledgeGraphManager} from '../core/KnowledgeGraphManager.js';
import type {ToolResponse} from '../types/tools.js';

interface ToolCallRequest {
    params: {
        name: string;
        arguments: Record<string, any>;
    };
}

/**
 * Handles incoming tool call requests by routing them to the appropriate handler
 */
export async function handleCallToolRequest(
    request: ToolCallRequest,
    knowledgeGraphManager: KnowledgeGraphManager
): Promise<ToolResponse> {
    try {
        const {name, arguments: args} = request.params;

        if (!args) {
            throw new Error("Tool arguments are required");
        }

        // Ensure tools registry is initialized
        if (!toolsRegistry.hasTool(name)) {
            return formatToolError({
                operation: "callTool",
                error: `Tool not found: ${name}`,
                suggestions: ["Verify the tool name is correct", "Check if the tool is registered"]
            });
        }

        // Initialize handlers if needed
        if (!ToolHandlerFactory.isInitialized()) {
            ToolHandlerFactory.initialize(knowledgeGraphManager);
        }

        // Get appropriate handler and process the request
        const handler = ToolHandlerFactory.getHandler(name);
        return await handler.handleTool(name, args);

    } catch (error) {
        console.error("Error in handleCallToolRequest:", error);
        return formatToolError({
            operation: "callTool",
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            context: {request},
            suggestions: [
                "Examine the tool input parameters for correctness",
                "Verify that the requested operation is supported"
            ],
            recoverySteps: ["Adjust the input parameters based on the schema definition"]
        });
    }
}