// src/tools/tools.js

import {initializeDynamicTools} from './DynamicSchemaToolRegistry.js';

/**
 * @typedef {Object} Tool
 * @property {string} name - The name of the tool.
 * @property {string} description - A brief description of what the tool does.
 * @property {Object} inputSchema - The JSON schema defining the tool's input parameters.
 */

/**
 * Initializes dynamic tools and combines them with predefined generic tools.
 *
 * @type {Tool[]}
 */
const dynamicTools = await initializeDynamicTools();

/**
 * @type {Tool[]}
 * @description Array of all tools, including dynamically generated schema-based tools and predefined generic tools.
 */
export const tools = [
    // Get dynamically generated tools from schemas
    ...dynamicTools.getTools(),

    {
        name: "add_nodes",
        description: "Add multiple new nodes in the knowledge graph",
        inputSchema: {
            type: "object",
            properties: {
                nodes: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {type: "string", description: "The name of the node"},
                            nodeType: {type: "string", description: "The type of the node"},
                            metadata: {
                                type: "array",
                                items: {type: "string"},
                                description: "An array of metadata contents associated with the node"
                            },
                        },
                        required: ["name", "nodeType", "metadata"],
                    },
                },
            },
            required: ["nodes"],
        },
    },
    {
        name: "update_nodes",
        description: "Update existing nodes in the knowledge graph",
        inputSchema: {
            type: "object",
            properties: {
                nodes: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {type: "string", description: "The name of the node to update"},
                            nodeType: {type: "string", description: "The new type of the node"},
                            metadata: {
                                type: "array",
                                items: {type: "string"},
                                description: "An array of new metadata contents for the node"
                            },
                        },
                        required: ["name"],
                    },
                },
            },
            required: ["nodes"],
        },
    },
    {
        name: "add_edges",
        description: "Add multiple new edges between nodes in the knowledge graph. Edges should be in active voice",
        inputSchema: {
            type: "object",
            properties: {
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            from: {
                                type: "string",
                                description: "The name of the node where the edge starts"
                            },
                            to: {type: "string", description: "The name of the node where the edge ends"},
                            edgeType: {type: "string", description: "The type of the edge"},
                        },
                        required: ["from", "to", "edgeType"],
                    },
                },
            },
            required: ["edges"],
        },
    },
    {
        name: "update_edges",
        description: "Update existing edges in the knowledge graph",
        inputSchema: {
            type: "object",
            properties: {
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            from: {
                                type: "string",
                                description: "Current source node name"
                            },
                            to: {
                                type: "string",
                                description: "Current target node name"
                            },
                            edgeType: {
                                type: "string",
                                description: "Current edge type"
                            },
                            newFrom: {
                                type: "string",
                                description: "New source node name"
                            },
                            newTo: {
                                type: "string",
                                description: "New target node name"
                            },
                            newEdgeType: {
                                type: "string",
                                description: "New edge type"
                            },
                        },
                        required: ["from", "to", "edgeType"],
                    },
                },
            },
            required: ["edges"],
        },
    },
    {
        name: "add_metadata",
        description: "Add new metadata to existing nodes in the knowledge graph",
        inputSchema: {
            type: "object",
            properties: {
                metadata: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            nodeName: {
                                type: "string",
                                description: "The name of the node to add the metadata to"
                            },
                            contents: {
                                type: "array",
                                items: {type: "string"},
                                description: "An array of metadata contents to add"
                            },
                        },
                        required: ["nodeName", "contents"],
                    },
                },
            },
            required: ["metadata"],
        },
    },
    {
        name: "delete_nodes",
        description: "Delete multiple nodes and their associated edges from the knowledge graph",
        inputSchema: {
            type: "object",
            properties: {
                nodeNames: {
                    type: "array",
                    items: {type: "string"},
                    description: "An array of node names to delete"
                },
            },
            required: ["nodeNames"],
        },
    },
    {
        name: "delete_metadata",
        description: "Delete specific metadata from nodes in the knowledge graph",
        inputSchema: {
            type: "object",
            properties: {
                deletions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            nodeName: {
                                type: "string",
                                description: "The name of the node containing the metadata"
                            },
                            metadata: {
                                type: "array",
                                items: {type: "string"},
                                description: "An array of metadata to delete"
                            },
                        },
                        required: ["nodeName", "metadata"],
                    },
                },
            },
            required: ["deletions"],
        },
    },
    {
        name: "delete_edges",
        description: "Delete multiple edges from the knowledge graph",
        inputSchema: {
            type: "object",
            properties: {
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            from: {
                                type: "string",
                                description: "The name of the node where the edge starts"
                            },
                            to: {type: "string", description: "The name of the node where the edge ends"},
                            edgeType: {type: "string", description: "The type of the edge"},
                        },
                        required: ["from", "to", "edgeType"],
                    },
                    description: "An array of edges to delete"
                },
            },
            required: ["edges"],
        },
    },
    {
        name: "read_graph",
        description: "Read the entire knowledge graph",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph based on a query",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query to match against node names, types, and metadata content"
                },
            },
            required: ["query"],
        },
    },
    {
        name: "open_nodes",
        description: "Open specific nodes in the knowledge graph by their names",
        inputSchema: {
            type: "object",
            properties: {
                names: {
                    type: "array",
                    items: {type: "string"},
                    description: "An array of node names to retrieve",
                },
            },
            required: ["names"],
        },
    },
];

/**
 * @type {DynamicSchemaToolRegistry}
 * @description The registry instance managing dynamic schema-based tools.
 */
export {dynamicTools};
