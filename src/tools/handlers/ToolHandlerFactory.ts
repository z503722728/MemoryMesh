// src/tools/handlers/ToolHandlerFactory.ts

import {GraphToolHandler} from './GraphToolHandler.js';
import {SearchToolHandler} from './SearchToolHandler.js';
import {MetadataToolHandler} from './MetadataToolHandler.js';
import {DynamicToolHandler} from './DynamicToolHandler.js';
import type {KnowledgeGraphManager} from '../../core/KnowledgeGraphManager.js';
import type {BaseToolHandler} from './BaseToolHandler.js';

export class ToolHandlerFactory {
    private static graphHandler: GraphToolHandler;
    private static searchHandler: SearchToolHandler;
    private static metadataHandler: MetadataToolHandler;
    private static dynamicHandler: DynamicToolHandler;

    static initialize(knowledgeGraphManager: KnowledgeGraphManager): void {
        this.graphHandler = new GraphToolHandler(knowledgeGraphManager);
        this.searchHandler = new SearchToolHandler(knowledgeGraphManager);
        this.metadataHandler = new MetadataToolHandler(knowledgeGraphManager);
        this.dynamicHandler = new DynamicToolHandler(knowledgeGraphManager);
    }

    static getHandler(toolName: string): BaseToolHandler {
        // First check for core tools
        if (toolName.match(/^(add|update|delete)_(nodes|edges)$/)) {
            return this.graphHandler;
        }
        if (toolName.match(/^(read_graph|search_nodes|open_nodes)$/)) {
            return this.searchHandler;
        }
        if (toolName.match(/^(add|delete)_metadata$/)) {
            return this.metadataHandler;
        }

        // If it's not a core tool, assume it's a dynamic tool
        if (toolName.match(/^(add|update|delete)_/)) {
            return this.dynamicHandler;
        }

        throw new Error(`No handler found for tool: ${toolName}`);
    }
}