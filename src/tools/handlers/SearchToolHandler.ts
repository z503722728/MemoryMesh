// src/tools/handlers/SearchToolHandler.ts

import {BaseToolHandler} from './BaseToolHandler.js';
import {formatToolResponse} from '../../utils/responseFormatter.js';
import type {ToolResponse} from '../../types/tools.js';

export class SearchToolHandler extends BaseToolHandler {
    async handleTool(name: string, args: Record<string, any>): Promise<ToolResponse> {
        try {
            this.validateArguments(args);

            switch (name) {
                case "read_graph":
                    return formatToolResponse({
                        data: await this.knowledgeGraphManager.readGraph(),
                        message: `Successfully read the knowledge graph`,
                        actionTaken: "Read the knowledge graph"
                    });

                case "search_nodes":
                    return formatToolResponse({
                        data: await this.knowledgeGraphManager.searchNodes(args.query),
                        message: `Successfully searched nodes with query: ${args.query}`,
                        actionTaken: "Searched nodes in the knowledge graph"
                    });

                case "open_nodes":
                    return formatToolResponse({
                        data: await this.knowledgeGraphManager.openNodes(args.names),
                        message: `Successfully opened nodes: ${args.names.join(', ')}`,
                        actionTaken: "Opened nodes in the knowledge graph"
                    });

                default:
                    throw new Error(`Unknown search operation: ${name}`);
            }
        } catch (error) {
            return this.handleError(name, error);
        }
    }
}