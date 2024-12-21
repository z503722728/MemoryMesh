// src/core/storage/JsonLineStorage.ts

import {promises as fs} from 'fs';
import {CONFIG} from '../../config/config.js';
import type {IStorage} from '../../types/storage.js';
import type {Edge, Graph, Node} from '../../types/graph.js';

/**
 * Handles persistent storage of the knowledge graph using a JSON Lines file format.
 */
export class JsonLineStorage implements IStorage {
    private edgeIndex: {
        byFrom: Map<string, Set<string>>;
        byTo: Map<string, Set<string>>;
        byType: Map<string, Set<string>>;
    };
    private edgeCache: Map<string, Edge>;

    constructor() {
        this.edgeIndex = {
            byFrom: new Map(),
            byTo: new Map(),
            byType: new Map()
        };
        this.edgeCache = new Map();
    }

    /**
     * Loads the entire knowledge graph from storage and builds the edge indices.
     */
    async loadGraph(): Promise<Graph> {
        try {
            const MEMORY_FILE_PATH = CONFIG.PATHS.MEMORY_FILE;
            const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
            const lines = data.split("\n").filter(line => line.trim() !== "");

            // Clear existing indices before rebuilding
            this.clearIndices();

            const graph: Graph = {nodes: [], edges: []};

            lines.forEach(line => {
                const item = JSON.parse(line);
                if (item.type === "node") {
                    graph.nodes.push(item as Node);
                }
                if (item.type === "edge") {
                    const edge = item as Edge;
                    graph.edges.push(edge);
                    this.indexEdge(edge);
                }
            });

            return graph;
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === "ENOENT") {
                return {nodes: [], edges: []};
            }
            throw error;
        }
    }

    /**
     * Saves the entire knowledge graph to storage.
     */
    async saveGraph(graph: Graph): Promise<void> {
        const MEMORY_FILE_PATH = CONFIG.PATHS.MEMORY_FILE;

        // Clear and rebuild indices
        this.clearIndices();
        graph.edges.forEach(edge => this.indexEdge(edge));

        const lines = [
            ...graph.nodes.map(node => JSON.stringify(node)),
            ...graph.edges.map(edge => JSON.stringify(edge)),
        ];

        await fs.writeFile(MEMORY_FILE_PATH, lines.join("\n"));
    }

    /**
     * Loads specific edges by their IDs from the cache.
     */
    async loadEdgesByIds(edgeIds: string[]): Promise<Edge[]> {
        return edgeIds
            .map(id => this.edgeCache.get(id))
            .filter((edge): edge is Edge => edge !== undefined);
    }

    /**
     * Indexes a single edge by adding it to all relevant indices.
     */
    private indexEdge(edge: Edge): void {
        const edgeId = this.generateEdgeId(edge);

        // Index by 'from' node
        if (!this.edgeIndex.byFrom.has(edge.from)) {
            this.edgeIndex.byFrom.set(edge.from, new Set());
        }
        this.edgeIndex.byFrom.get(edge.from)?.add(edgeId);

        // Index by 'to' node
        if (!this.edgeIndex.byTo.has(edge.to)) {
            this.edgeIndex.byTo.set(edge.to, new Set());
        }
        this.edgeIndex.byTo.get(edge.to)?.add(edgeId);

        // Index by edge type
        if (!this.edgeIndex.byType.has(edge.edgeType)) {
            this.edgeIndex.byType.set(edge.edgeType, new Set());
        }
        this.edgeIndex.byType.get(edge.edgeType)?.add(edgeId);

        // Cache the edge
        this.edgeCache.set(edgeId, edge);
    }

    /**
     * Generates a unique ID for an edge based on its properties.
     */
    private generateEdgeId(edge: Edge): string {
        return `${edge.from}|${edge.to}|${edge.edgeType}`;
    }

    /**
     * Clears all edge indices and cache.
     */
    private clearIndices(): void {
        this.edgeIndex.byFrom.clear();
        this.edgeIndex.byTo.clear();
        this.edgeIndex.byType.clear();
        this.edgeCache.clear();
    }
}