// src/tools/handlers/GraphToolHandler.ts

import {BaseToolHandler} from './BaseToolHandler.js';
import {formatToolResponse} from '../../utils/responseFormatter.js';
import type {ToolResponse} from '../../types/tools.js';

export class GraphToolHandler extends BaseToolHandler {
    async handleTool(name: string, args: Record<string, any>): Promise<ToolResponse> {
        try {
            this.validateArguments(args);

            switch (name) {
                case "add_nodes":
                    return formatToolResponse({
                        data: {nodes: await this.knowledgeGraphManager.addNodes(args.nodes)},
                        message: `Successfully added ${args.nodes.length} nodes`,
                        actionTaken: "Added nodes to the knowledge graph"
                    });

                case "update_nodes":
                    return formatToolResponse({
                        data: {nodes: await this.knowledgeGraphManager.updateNodes(args.nodes)},
                        message: `Successfully updated ${args.nodes.length} nodes`,
                        actionTaken: "Updated nodes in the knowledge graph"
                    });

                case "add_edges":
                    return formatToolResponse({
                        data: {edges: await this.knowledgeGraphManager.addEdges(args.edges)},
                        message: `Successfully added ${args.edges.length} edges`,
                        actionTaken: "Added edges to the knowledge graph"
                    });

                case "update_edges":
                    return formatToolResponse({
                        data: {edges: await this.knowledgeGraphManager.updateEdges(args.edges)},
                        message: `Successfully updated ${args.edges.length} edges`,
                        actionTaken: "Updated edges in the knowledge graph"
                    });

                case "delete_nodes":
                    await this.knowledgeGraphManager.deleteNodes(args.nodeNames);
                    return formatToolResponse({
                        message: `Successfully deleted nodes: ${args.nodeNames.join(', ')}`,
                        actionTaken: "Deleted nodes from the knowledge graph"
                    });

                case "delete_edges":
                    await this.knowledgeGraphManager.deleteEdges(args.edges);
                    return formatToolResponse({
                        message: `Successfully deleted edges`,
                        actionTaken: "Deleted edges from the knowledge graph"
                    });

                default:
                    throw new Error(`Unknown graph operation: ${name}`);
            }
        } catch (error) {
            return this.handleError(name, error);
        }
    }
}