// src/core/utils/ValidationUtils.ts

import {Graph, Edge, Node} from '@core/index.js';

/**
 * Utility class providing validation methods for common operations
 * within the knowledge graph.
 */
export class ValidationUtils {
    /**
     * Validates that a node with the given name exists in the graph.
     * @param graph The knowledge graph.
     * @param nodeName The name of the node to check.
     * @throws Error if the node does not exist.
     */
    static validateNodeExists(graph: Graph, nodeName: string): void {
        if (!graph.nodes.some(node => node.name === nodeName)) {
            throw new Error(`Node not found: ${nodeName}`);
        }
    }

    /**
     * Validates that an edge is unique in the graph (no existing edge with the same from, to, and edgeType).
     * @param graph The knowledge graph.
     * @param edge The edge to check.
     * @throws Error if an edge with the same properties already exists.
     */
    static validateEdgeUniqueness(graph: Graph, edge: Edge): void {
        if (graph.edges.some(existing =>
            existing.from === edge.from &&
            existing.to === edge.to &&
            existing.edgeType === edge.edgeType
        )) {
            throw new Error(`Edge already exists: ${edge.from} -> ${edge.to} (${edge.edgeType})`);
        }
    }

    /**
     * Validates that a node has a 'name' and 'nodeType' property.
     * @param node The node to check
     * @throws Error if the node does not have a 'name' or 'nodeType' property.
     */
    static validateNodeProperties(node: Node): void {
        if (!node.name || !node.nodeType) {
            throw new Error("Node must have a 'name' and 'nodeType'");
        }
    }

    /**
     * Validates that a node with the given name does not exist in the graph.
     * @param graph The knowledge graph.
     * @param nodeName The name of the node to check.
     * @throws Error if the node already exists.
     */
    static validateNodeDoesNotExist(graph: Graph, nodeName: string): void {
        if (graph.nodes.some(existing => existing.name === nodeName)) {
            throw new Error(`Node already exists: ${nodeName}. Consider updating existing node.`);
        }
    }

    /**
     * Validates that a node has a 'name' property.
     * @param node The node to check
     * @throws Error if the node does not have a 'name' property.
     */
    static validateNodeNameProperty(node: Partial<Node>): void {
        if (!node.name) {
            throw new Error("Node must have a 'name' for updating");
        }
    }

    /**
     * Validates that an array is provided for nodeNames.
     * @param nodeNames The array of node names to check.
     * @throws Error if nodeNames is not an array.
     */
    static validateNodeNamesArray(nodeNames: string[]): void {
        if (!Array.isArray(nodeNames)) {
            throw new Error("nodeNames must be an array");
        }
    }
}