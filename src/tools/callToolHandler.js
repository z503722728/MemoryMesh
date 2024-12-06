// src/tools/callToolHandler.js
import {dynamicTools} from './tools.js';
import {ErrorCode, McpError} from "@modelcontextprotocol/sdk/types.js";

/**
 * Handles incoming tool call requests by routing them to the appropriate handler based on the tool name.
 *
 * @param {Object} request - The incoming request containing tool call parameters.
 * @param {Object} knowledgeGraphManager - The manager instance for interacting with the knowledge graph.
 * @returns {Promise<Object>} - The result of the tool call.
 * @throws {McpError} If the tool is unknown or if processing the tool call fails.
 */
export async function handleCallToolRequest(request, knowledgeGraphManager) {
    const {name, arguments: args} = request.params;

    if (!args) {
        throw new McpError(
            ErrorCode.InvalidParams,
            `No arguments provided for tool: ${name}`
        );
    }

    try {
        // First check if it's a generic tool
        switch (name) {
            case "add_nodes":
                return {toolResult: await knowledgeGraphManager.addNodes(args.nodes)};

            case "update_nodes":
                return {toolResult: await knowledgeGraphManager.updateNodes(args.nodes)};

            case "add_edges":
                return {toolResult: await knowledgeGraphManager.addEdges(args.edges)};

            case "update_edges":
                return {toolResult: await knowledgeGraphManager.updateEdges(args.edges)};

            case "add_metadata":
                return {toolResult: await knowledgeGraphManager.addMetadata(args.metadata)};

            case "delete_nodes":
                await knowledgeGraphManager.deleteNodes(args.nodeNames);
                return {toolResult: "Nodes deleted successfully"};

            case "delete_metadata":
                await knowledgeGraphManager.deleteMetadata(args.deletions);
                return {toolResult: "Metadata deleted successfully"};

            case "delete_edges":
                await knowledgeGraphManager.deleteEdges(args.edges);
                return {toolResult: "Edges deleted successfully"};

            case "read_graph":
                return {toolResult: await knowledgeGraphManager.readGraph()};

            case "search_nodes":
                return {toolResult: await knowledgeGraphManager.searchNodes(args.query)};

            case "open_nodes":
                return {toolResult: await knowledgeGraphManager.openNodes(args.names)};

            default:
                // Only try schema-based handling if it's not a generic tool
                if (name.match(/^(add|update|delete)_/)) {
                    return await dynamicTools.handleToolCall(name, args, knowledgeGraphManager);
                }

                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${name}`
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
            `Error processing tool request: ${error.message}`
        );
    }
}
