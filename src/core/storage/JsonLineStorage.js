// src/storage/JsonLineStorage.js
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

/**
 * @class JsonLineStorage
 * @classdesc Handles the storage of the knowledge graph using a JSON Lines file format. Each line in the file represents a node or an edge in JSON format.
 */
export class JsonLineStorage {
    /**
     * Loads the entire knowledge graph from the JSON Lines file.
     *
     * @returns {Promise<Object>} - The loaded graph containing nodes and edges.
     * @throws {Error} If reading the file fails for reasons other than the file not existing.
     */
    async loadGraph() {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const MEMORY_FILE_PATH = path.join(__dirname, '../../data/memory.json');

        try {
            const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
            const lines = data.split("\n").filter(line => line.trim() !== "");
            return lines.reduce((graph, line) => {
                const item = JSON.parse(line);
                if (item.type === "node")
                    graph.nodes.push(item);
                if (item.type === "edge")
                    graph.edges.push(item);
                return graph;
            }, {nodes: [], edges: []});
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === "ENOENT") {
                return {nodes: [], edges: []};
            }
            throw error;
        }
    }

    /**
     * Saves the entire knowledge graph to the JSON Lines file.
     *
     * @param {Object} graph - The graph object containing nodes and edges to save.
     * @returns {Promise<void>}
     * @throws {Error} If writing to the file fails.
     */
    async saveGraph(graph) {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const MEMORY_FILE_PATH = path.join(__dirname, '../../data/memory.json');

        const lines = [
            ...graph.nodes.map(e => JSON.stringify({type: "node", ...e})),
            ...graph.edges.map(r => JSON.stringify({type: "edge", ...r})),
        ];
        await fs.writeFile(MEMORY_FILE_PATH, lines.join("\n"));
    }
}
