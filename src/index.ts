#!/usr/bin/env node
import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {KnowledgeGraphManager} from './core/KnowledgeGraphManager.js';
import {handleCallToolRequest} from './tools/callToolHandler.js';
import {tools} from './tools/tools.js';
import {CONFIG} from './config/config.js';
import {formatToolError} from "./utils/responseFormatter.js";

const knowledgeGraphManager = new KnowledgeGraphManager();

const server = new Server({
    name: CONFIG.SERVER.NAME,
    version: CONFIG.SERVER.VERSION,
}, {
    capabilities: {
        tools: {},
    },
});

async function main(): Promise<void> {
    try {
        server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                }))
            };
        });

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                if (!request.params.arguments) {
                    throw new Error("Tool arguments are required");
                }

                const toolRequest = {
                    params: {
                        name: request.params.name,
                        arguments: request.params.arguments
                    }
                };

                const result = await handleCallToolRequest(toolRequest, knowledgeGraphManager);

                return {
                    toolResult: result.toolResult
                };
            } catch (error) {
                console.error("Error in handleCallToolRequest:", error);
                const formattedError = formatToolError({
                    operation: "callTool",
                    error: error instanceof Error ? error.message : 'Unknown error occurred',
                    context: {request},
                    suggestions: ["Examine the tool input parameters for correctness.", "Verify that the requested operation is supported."],
                    recoverySteps: ["Adjust the input parameters based on the schema definition."]
                });
                return {
                    toolResult: formattedError.toolResult
                };
            }
        });

        server.onerror = (error: Error) => {
            console.error("[MCP Server Error]", error);
        };

        process.on('SIGINT', async () => {
            await server.close();
            process.exit(0);
        });

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Knowledge Graph MCP Server running on stdio");
    } catch (error) {
        console.error("Fatal error during server startup:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});