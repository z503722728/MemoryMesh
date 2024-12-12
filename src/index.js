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

/**
 * Initializes and starts the Knowledge Graph MCP Server.
 *
 * @classdesc The main entry point for the MCP server that manages the knowledge graph. It sets up request handlers, initializes dynamic tools, and handles server events.
 */

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
const knowledgeGraphManager = new KnowledgeGraphManager();

// The server instance and tools exposed to Claude
const server = new Server({
    name: CONFIG.SERVER.NAME,
    version: CONFIG.SERVER.VERSION,
}, {
    capabilities: {
        tools: {},  // Removed listChanged since we're not using dynamic updates
    },
});

/**
 * The main function that initializes and starts the server.
 *
 * @async
 * @function main
 * @returns {Promise<void>}
 */
async function main() {
    try {
        // Set up request handlers with dynamic tools
        server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: tools,
            };
        });

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const result = await handleCallToolRequest(request, knowledgeGraphManager);
                return result;
            } catch (error) {
                console.error("Error in handleCallToolRequest:", error);
                return formatToolError({
                    operation: "callTool",
                    error: error.message,
                    context: {request},
                    suggestions: ["Examine the tool input parameters for correctness.", "Verify that the requested operation is supported."],
                    recoverySteps: ["Adjust the input parameters based on the schema definition.", "If the error indicates a problem with the node or edge, ensure it exists and is correctly named."]
                });
            }
        });

        // Set up error handler
        server.onerror = (error) => {
            console.error("[MCP Server Error]", error);
        };

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            await server.close();
            process.exit(0);
        });

        // Connect transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Knowledge Graph MCP Server (RPG edition) running on stdio");
    } catch (error) {
        console.error("Fatal error during server startup:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});