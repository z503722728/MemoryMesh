// src/core/managers/implementations/NodeManager.js
import {INodeManager} from '../interfaces/INodeManager.js';
import {formatToolResponse, formatToolError} from '../../../utils/responseFormatter.js';

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
     * @returns {Promise<Object>} - Formatted tool response containing the newly added nodes or an error.
     */
    async addNodes(nodes) {
        try {
            this.emit('beforeAddNodes', {nodes});

            const graph = await this.storage.loadGraph();
            const newNodes = [];

            for (const node of nodes) {
                if (!node.name || !node.nodeType) {
                    return formatToolError({
                        operation: 'addNodes',
                        error: "Node must have a 'name' and 'nodeType'",
                        context: {node},
                        suggestions: ["Provide both 'name' and 'nodeType' for each node"]
                    });
                }

                if (graph.nodes.some(existing => existing.name === node.name)) {
                    return formatToolError({
                        operation: 'addNodes',
                        error: `Node already exists: ${node.name}`,
                        context: {node},
                        suggestions: ["Use a unique name for the new node"]
                    });
                }

                newNodes.push(node);
            }

            graph.nodes.push(...newNodes);
            await this.storage.saveGraph(graph);

            this.emit('afterAddNodes', {nodes: newNodes});
            return formatToolResponse({
                data: {nodes: newNodes},
                message: `Successfully added ${newNodes.length} nodes`,
                actionTaken: "Added nodes to the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'addNodes',
                error: error.message,
                context: {nodes},
                suggestions: ["Check the format of the node data", "Ensure that node names are unique"]
            });
        }
    }

    /**
     * Updates existing nodes in the knowledge graph.
     *
     * @param {Array<Object>} nodes - Array of node objects with updates. Each node must have a `name` to identify it.
     * @returns {Promise<Object>} - Formatted tool response containing the updated nodes or an error.
     */
    async updateNodes(nodes) {
        try {
            this.emit('beforeUpdateNodes', {nodes});

            const graph = await this.storage.loadGraph();
            const updatedNodes = [];

            for (const updateNode of nodes) {
                const nodeIndex = graph.nodes.findIndex(n => n.name === updateNode.name);
                if (nodeIndex === -1) {
                    return formatToolError({
                        operation: 'updateNodes',
                        error: `Node not found: ${updateNode.name}`,
                        context: {node: updateNode},
                        suggestions: ["Ensure the node you are trying to update exists"]
                    });
                }

                graph.nodes[nodeIndex] = {
                    ...graph.nodes[nodeIndex],
                    ...updateNode
                };
                updatedNodes.push(graph.nodes[nodeIndex]);
            }

            await this.storage.saveGraph(graph);

            this.emit('afterUpdateNodes', {nodes: updatedNodes});
            return formatToolResponse({
                data: {nodes: updatedNodes},
                message: `Successfully updated ${updatedNodes.length} nodes`,
                actionTaken: "Updated nodes in the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'updateNodes',
                error: error.message,
                context: {nodes},
                suggestions: ["Check the format of the node data", "Ensure that the nodes you are trying to update exist"]
            });
        }
    }

    /**
     * Deletes nodes and their associated edges from the knowledge graph.
     *
     * @param {Array<string>} nodeNames - Array of node names to delete.
     * @returns {Promise<Object>} - Formatted tool response indicating the result of the operation or an error.
     */
    async deleteNodes(nodeNames) {
        try {
            if (!Array.isArray(nodeNames)) {
                return formatToolError({
                    operation: 'deleteNodes',
                    error: "nodeNames must be an array",
                    context: {nodeNames},
                    suggestions: ["Provide an array of node names to delete"]
                });
            }

            this.emit('beforeDeleteNodes', {nodeNames});

            const graph = await this.storage.loadGraph();
            const initialNodeCount = graph.nodes.length;

            graph.nodes = graph.nodes.filter(node => !nodeNames.includes(node.name));
            graph.edges = graph.edges.filter(edge =>
                !nodeNames.includes(edge.from) && !nodeNames.includes(edge.to)
            );

            const deletedCount = initialNodeCount - graph.nodes.length;

            await this.storage.saveGraph(graph);

            this.emit('afterDeleteNodes', {deletedCount});
            return formatToolResponse({
                message: `Successfully deleted ${deletedCount} nodes`,
                actionTaken: "Deleted nodes and associated edges from the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'deleteNodes',
                error: error.message,
                context: {nodeNames},
                suggestions: ["Check the format of the node names", "Ensure that the nodes you are trying to delete exist"]
            });
        }
    }

    /**
     * Retrieves specific nodes from the knowledge graph by their names.
     *
     * @param {Array<string>} nodeNames - Array of node names to retrieve.
     * @returns {Promise<Object>} - Formatted tool response containing the requested nodes or an error.
     */
    async getNodes(nodeNames) {
        try {
            const graph = await this.storage.loadGraph();
            const nodes = graph.nodes.filter(node => nodeNames.includes(node.name));

            return formatToolResponse({
                data: {nodes},
                message: `Successfully retrieved ${nodes.length} nodes`,
                actionTaken: "Retrieved nodes from the knowledge graph"
            });
        } catch (error) {
            return formatToolError({
                operation: 'getNodes',
                error: error.message,
                context: {nodeNames},
                suggestions: ["Check the connection to the storage", "Ensure that the nodes you are trying to retrieve exist"]
            });
        }
    }
}