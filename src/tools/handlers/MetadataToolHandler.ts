// src/tools/handlers/MetadataToolHandler.ts

import {BaseToolHandler} from './BaseToolHandler.js';
import {formatToolResponse} from '../../utils/responseFormatter.js';
import type {ToolResponse} from '../../types/tools.js';

export class MetadataToolHandler extends BaseToolHandler {
    async handleTool(name: string, args: Record<string, any>): Promise<ToolResponse> {
        try {
            this.validateArguments(args);

            switch (name) {
                case "add_metadata":
                    return formatToolResponse({
                        data: {metadata: await this.knowledgeGraphManager.addMetadata(args.metadata)},
                        message: `Successfully added metadata`,
                        actionTaken: "Added metadata to nodes in the knowledge graph"
                    });

                case "delete_metadata":
                    await this.knowledgeGraphManager.deleteMetadata(args.deletions);
                    return formatToolResponse({
                        message: `Successfully deleted metadata`,
                        actionTaken: "Deleted metadata from nodes in the knowledge graph"
                    });

                default:
                    throw new Error(`Unknown metadata operation: ${name}`);
            }
        } catch (error) {
            return this.handleError(name, error);
        }
    }
}