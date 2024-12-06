// src/schema/loader/schemaProcessor.js

/**
 * Creates a node based on schema definition and input data.
 *
 * @param {Object} data - Input data for the node.
 * @param {Object} schema - Schema definition from SchemaBuilder.
 * @param {string} nodeType - Type of node to create.
 * @returns {Promise<Object>} - Object containing nodes and edges arrays.
 * @throws {Error} If required fields are missing or processing fails.
 */
export async function createSchemaNode(data, schema, nodeType) {
    const {metadataConfig, relationships} = schema;

    // Initialize arrays for metadata, nodes, and edges
    const metadata = [];
    const nodes = [];
    const edges = [];

    // Process required fields
    for (const field of metadataConfig.requiredFields) {
        if (data[field] === undefined) {
            throw new Error(`Required field "${field}" is missing`);
        }
        metadata.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${data[field]}`);
    }

    // Process optional fields
    for (const field of metadataConfig.optionalFields) {
        if (data[field]) {
            if (Array.isArray(data[field])) {
                metadata.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${data[field].join(', ')}`);
            } else {
                metadata.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${data[field]}`);
            }
        }
    }

    // Process relationships
    if (relationships) {
        for (const [field, config] of Object.entries(relationships)) {
            if (data[field]) {
                const value = data[field];
                if (Array.isArray(value)) {
                    value.forEach(target => {
                        edges.push({
                            from: data.name,
                            to: target,
                            edgeType: config.edgeType
                        });
                    });
                } else {
                    edges.push({
                        from: data.name,
                        to: value,
                        edgeType: config.edgeType
                    });
                }
            }
        }
    }

    // Process additional properties
    const excludedFields = new Set([
        ...metadataConfig.requiredFields,
        ...metadataConfig.optionalFields,
        ...(metadataConfig.excludeFields || []),
        'name'  // Always exclude name as it's used as node identifier
    ]);

    for (const [key, value] of Object.entries(data)) {
        if (!excludedFields.has(key) && value !== undefined) {
            if (Array.isArray(value)) {
                metadata.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.join(', ')}`);
            } else {
                metadata.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
            }
        }
    }

    // Create the main node
    const mainNode = {
        name: data.name,
        nodeType,
        metadata
    };
    nodes.push(mainNode);

    return {nodes, edges};
}

/**
 * Updates a node's metadata and relationships based on schema definition.
 *
 * @param {Object} updates - Update data for the node.
 * @param {Object} currentNode - Current node to update.
 * @param {Object} schema - Schema definition from SchemaBuilder.
 * @param {Object} currentGraph - Current graph state.
 * @returns {Promise<Object>} - Updated node metadata and edge changes.
 * @throws {Error} If processing updates fails.
 */
export async function updateSchemaNode(updates, currentNode, schema, currentGraph) {
    const {metadataConfig, relationships} = schema;
    const metadata = [...currentNode.metadata];
    const edgeChanges = {
        remove: [],
        add: []
    };

    // Create a set of relationship fields from the schema
    const relationshipFields = new Set(Object.keys(relationships || {}));

    // Function to update or add metadata entry
    const updateMetadataEntry = (key, value) => {
        // Skip if it's a relationship field
        if (relationshipFields.has(key)) return;

        const metaKey = `${key.charAt(0).toUpperCase() + key.slice(1)}:`;
        const existingIndex = metadata.findIndex(meta => meta.startsWith(metaKey));

        const newValue = Array.isArray(value) ? value.join(', ') : value;
        const newEntry = `${metaKey} ${newValue}`;

        if (existingIndex !== -1) {
            metadata[existingIndex] = newEntry;
        } else {
            metadata.push(newEntry);
        }
    };

    // Handle all schema-defined fields (both required and optional)
    const allSchemaFields = [...metadataConfig.requiredFields, ...metadataConfig.optionalFields];
    for (const field of allSchemaFields) {
        if (updates[field] !== undefined && !relationshipFields.has(field)) {
            updateMetadataEntry(field, updates[field]);
        }
    }

    // Process relationships
    if (relationships) {
        for (const [field, config] of Object.entries(relationships)) {
            if (updates[field] !== undefined) {
                // Find existing edges for this relationship
                const existingEdges = currentGraph.edges.filter(edge =>
                    edge.from === currentNode.name &&
                    edge.edgeType === config.edgeType
                );

                // Mark existing edges for removal
                edgeChanges.remove.push(...existingEdges);

                // Create new edges
                const value = updates[field];
                if (Array.isArray(value)) {
                    value.forEach(target => {
                        edgeChanges.add.push({
                            from: currentNode.name,
                            to: target,
                            edgeType: config.edgeType
                        });
                    });
                } else if (value) {
                    edgeChanges.add.push({
                        from: currentNode.name,
                        to: value,
                        edgeType: config.edgeType
                    });
                }
            }
        }
    }

    // Process additional properties (excluding relationships and schema fields)
    const excludedFields = new Set([
        ...allSchemaFields,
        ...(metadataConfig.excludeFields || []),
        ...relationshipFields,
        'name',
        'metadata'
    ]);

    for (const [key, value] of Object.entries(updates)) {
        if (!excludedFields.has(key) && value !== undefined) {
            updateMetadataEntry(key, value);
        }
    }

    return {metadata, edgeChanges};
}

/**
 * Handles the complete update process for a schema-based entity.
 *
 * @param {Object} updates - Update data for the entity.
 * @param {Object} schema - Schema definition from SchemaBuilder.
 * @param {string} nodeType - Type of node to update.
 * @param {Object} knowledgeGraphManager - Graph manager instance.
 * @returns {Promise<Object>} - Updated nodes and edge changes.
 * @throws {Error} If handling the update fails.
 */
export async function handleSchemaUpdate(updates, schema, nodeType, knowledgeGraphManager) {
    const graph = await knowledgeGraphManager.readGraph();

    // Find the node
    const node = graph.nodes.find(n => n.name === updates.name && n.nodeType === nodeType);
    if (!node) {
        throw new Error(`${nodeType} "${updates.name}" not found`);
    }

    // Process updates using the schema
    const {metadata, edgeChanges} = await updateSchemaNode(
        updates,
        node,
        schema,
        graph
    );

    // Update the node
    const updatedNode = {
        ...node,
        metadata
    };

    // Handle edge changes in a transaction-like manner
    if (edgeChanges.remove.length > 0) {
        await knowledgeGraphManager.deleteEdges(edgeChanges.remove);
    }

    if (edgeChanges.add.length > 0) {
        await knowledgeGraphManager.addEdges(edgeChanges.add);
    }

    // Update the node in the graph
    await knowledgeGraphManager.updateNodes([updatedNode]);

    return {
        updatedNodes: [updatedNode],
        edgeChanges
    };
}

/**
 * Handles the complete delete process for a schema-based entity.
 *
 * @param {string} nodeName - Name of the node to delete.
 * @param {string} nodeType - Type of node to delete.
 * @param {Object} knowledgeGraphManager - Graph manager instance.
 * @returns {Promise<Object>} - Result of the deletion.
 * @throws {Error} If handling the deletion fails.
 */
export async function handleSchemaDelete(nodeName, nodeType, knowledgeGraphManager) {
    const graph = await knowledgeGraphManager.readGraph();

    // Find the node
    const node = graph.nodes.find(n => n.name === nodeName && n.nodeType === nodeType);
    if (!node) {
        throw new Error(`${nodeType} "${nodeName}" not found`);
    }

    // Delete the node and its associated edges
    await knowledgeGraphManager.deleteNodes([nodeName]);

    return {result: `${nodeType} "${nodeName}" deleted successfully`};
}
