// src/managers/implementations/NodeManager.js
import {INodeManager} from '../interfaces/INodeManager.js';

/**
 * @class NodeManager
 * @extends INodeManager
 * @classdesc Implements node-related operations for the knowledge graph, including adding, updating, deleting, and retrieving nodes.
 */
export class NodeManager extends INodeManager {
    /**
     * Creates an instance of NodeManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     */
    constructor(storage) {
        super(storage);
    }

    /**
     * Adds new nodes to the knowledge graph.
     *
     * @param {Array<Object>} nodes - Array of node objects to add. Each node should have at least a `name` and `nodeType`.
     * @returns {Promise<Array<Object>>} - Array of newly added nodes.
     * @throws {Error} If adding nodes fails.
     */
    async addNodes(nodes) {
        try {
            this.emit('beforeAddNodes', {nodes});

            const graph = await this.storage.loadGraph();
            const newNodes = nodes.filter(node =>
                !graph.nodes.some(existing => existing.name === node.name)
            );

            if (newNodes.length === 0) {
                return [];
            }

            graph.nodes.push(...newNodes);
            await this.storage.saveGraph(graph);

            this.emit('afterAddNodes', {nodes: newNodes});
            return newNodes;
        } catch (error) {
            this.emit('error', {operation: 'addNodes', error});
            throw error;
        }
    }

    /**
     * Updates existing nodes in the knowledge graph.
     *
     * @param {Array<Object>} nodes - Array of node objects with updates. Each node must have a `name` to identify it.
     * @returns {Promise<Array<Object>>} - Array of updated nodes.
     * @throws {Error} If the node to update is not found or if updating nodes fails.
     */
    async updateNodes(nodes) {
        try {
            this.emit('beforeUpdateNodes', {nodes});

            const graph = await this.storage.loadGraph();
            const updatedNodes = [];

            for (const updateNode of nodes) {
                const node = graph.nodes.find(n => n.name === updateNode.name);
                if (!node) {
                    throw new Error(`Node with name "${updateNode.name}" not found`);
                }

                Object.assign(node, updateNode);
                updatedNodes.push(node);
            }

            await this.storage.saveGraph(graph);

            this.emit('afterUpdateNodes', {nodes: updatedNodes});
            return updatedNodes;
        } catch (error) {
            this.emit('error', {operation: 'updateNodes', error});
            throw error;
        }
    }

    /**
     * Deletes nodes and their associated edges from the knowledge graph.
     *
     * @param {Array<string>} nodeNames - Array of node names to delete.
     * @returns {Promise<void>}
     * @throws {Error} If node names are not an array or if deleting nodes fails.
     */
    async deleteNodes(nodeNames) {
        try {
            if (!Array.isArray(nodeNames)) {
                throw new Error('Node names must be an array');
            }

            this.emit('beforeDeleteNodes', {nodeNames});

            const graph = await this.storage.loadGraph();
            const initialNodeCount = graph.nodes.length;

            graph.nodes = graph.nodes.filter(node => !nodeNames.includes(node.name));
            graph.edges = graph.edges.filter(edge =>
                !nodeNames.includes(edge.from) && !nodeNames.includes(edge.to)
            );

            await this.storage.saveGraph(graph);

            const deletedCount = initialNodeCount - graph.nodes.length;
            this.emit('afterDeleteNodes', {deletedCount});
        } catch (error) {
            this.emit('error', {operation: 'deleteNodes', error});
            throw error;
        }
    }

    /**
     * Retrieves specific nodes from the knowledge graph by their names.
     *
     * @param {Array<string>} nodeNames - Array of node names to retrieve.
     * @returns {Promise<Array<Object>>} - Array of nodes matching the provided names.
     * @throws {Error} If retrieving nodes fails.
     */
    async getNodes(nodeNames) {
        try {
            const graph = await this.storage.loadGraph();
            return graph.nodes.filter(node => nodeNames.includes(node.name));
        } catch (error) {
            this.emit('error', {operation: 'getNodes', error});
            throw error;
        }
    }
}
