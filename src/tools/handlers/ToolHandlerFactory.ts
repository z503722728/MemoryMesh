// src/tools/handlers/ToolHandlerFactory.ts

import {GraphToolHandler} from './GraphToolHandler.js';
import {SearchToolHandler} from './SearchToolHandler.js';
import {MetadataToolHandler} from './MetadataToolHandler.js';
import {DynamicToolHandler} from './DynamicToolHandler.js';
import {toolsRegistry} from '../registry/toolsRegistry.js';
import type {KnowledgeGraphManager} from '../../core/KnowledgeGraphManager.js';
import type {BaseToolHandler} from './BaseToolHandler.js';

export class ToolHandlerFactory {
    private static graphHandler: GraphToolHandler;
    private static searchHandler: SearchToolHandler;
    private static metadataHandler: MetadataToolHandler;
    private static dynamicHandler: DynamicToolHandler;
    private static initialized = false;

    /**
     * Initializes all tool handlers
     */
    static initialize(knowledgeGraphManager: KnowledgeGraphManager): void {
        if (this.initialized) {
            return;
        }

        this.graphHandler = new GraphToolHandler(knowledgeGraphManager);
        this.searchHandler = new SearchToolHandler(knowledgeGraphManager);
        this.metadataHandler = new MetadataToolHandler(knowledgeGraphManager);
        this.dynamicHandler = new DynamicToolHandler(knowledgeGraphManager);

        this.initialized = true;
    }

    /**
     * Gets the appropriate handler for a given tool name
     */
    static getHandler(toolName: string): BaseToolHandler {
        if (!this.initialized) {
            throw new Error('ToolHandlerFactory not initialized');
        }

        // First check if it's a dynamic tool
        if (toolsRegistry.hasTool(toolName) && toolName.match(/^(add|update|delete)_/)) {
            return this.dynamicHandler;
        }

        // Then check static tools
        if (toolName.match(/^(add|update|delete)_(nodes|edges)$/)) {
            return this.graphHandler;
        }
        if (toolName.match(/^(read_graph|search_nodes|open_nodes)$/)) {
            return this.searchHandler;
        }
        if (toolName.match(/^(add|delete)_metadata$/)) {
            return this.metadataHandler;
        }

        throw new Error(`No handler found for tool: ${toolName}`);
    }

    /**
     * Checks if factory is initialized
     */
    static isInitialized(): boolean {
        return this.initialized;
    }
}