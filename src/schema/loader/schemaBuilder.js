// src/schema/loader/schemaBuilder.js

/**
 * @class SchemaBuilder
 * @classdesc Facilitates the construction and manipulation of schemas for nodes in the knowledge graph. Allows adding properties, relationships, and configuring metadata.
 */
export class SchemaBuilder {
    /**
     * Creates an instance of SchemaBuilder.
     *
     * @param {string} name - The name of the schema.
     * @param {string} description - A brief description of the schema.
     */
    constructor(name, description) {
        /**
         * @private
         * @type {Object}
         * @description The base schema structure being built.
         */
        this.schema = {
            name,
            description,
            inputSchema: {
                type: "object",
                properties: {
                    [name.replace('add_', '')]: {
                        type: "object",
                        properties: {},
                        required: [],
                        additionalProperties: {
                            type: "string",
                            description: "Any additional properties"
                        }
                    }
                },
                required: [name.replace('add_', '')]
            }
        };
        /**
         * @private
         * @type {Map<string, Object>}
         * @description Stores relationship definitions with property names as keys.
         */
        this.relationships = new Map();
        /**
         * @private
         * @type {Object}
         * @description Configuration for metadata fields, categorizing them into required, optional, and excluded fields.
         */
        this.metadataConfig = {
            requiredFields: [],
            optionalFields: [],
            excludeFields: []
        };
    }

    /**
     * Adds a string property to the schema with an optional enum.
     *
     * @param {string} name - Property name.
     * @param {string} description - Property description.
     * @param {boolean} [required=false] - Whether the property is required.
     * @param {string[]} [enumValues=null] - Optional array of allowed values.
     * @returns {SchemaBuilder} - Returns this for method chaining.
     */
    addStringProperty(name, description, required = false, enumValues = null) {
        const property = {
            type: "string",
            description
        };

        if (enumValues) {
            property.enum = enumValues;
        }

        this.schema.inputSchema.properties[this.schema.name.replace('add_', '')].properties[name] = property;

        if (required) {
            this.schema.inputSchema.properties[this.schema.name.replace('add_', '')].required.push(name);
            this.metadataConfig.requiredFields.push(name);
        } else {
            this.metadataConfig.optionalFields.push(name);
        }

        return this;
    }

    /**
     * Adds an array property to the schema with optional enum values for items.
     *
     * @param {string} name - Property name.
     * @param {string} description - Property description.
     * @param {boolean} [required=false] - Whether the property is required.
     * @param {string[]} [enumValues=null] - Optional array of allowed values for array items.
     * @returns {SchemaBuilder} - Returns this for method chaining.
     */
    addArrayProperty(name, description, required = false, enumValues = null) {
        const property = {
            type: "array",
            items: {
                type: "string"
            },
            description
        };

        if (enumValues) {
            property.items.enum = enumValues;
        }

        this.schema.inputSchema.properties[this.schema.name.replace('add_', '')].properties[name] = property;

        if (required) {
            this.schema.inputSchema.properties[this.schema.name.replace('add_', '')].required.push(name);
            this.metadataConfig.requiredFields.push(name);
        } else {
            this.metadataConfig.optionalFields.push(name);
        }

        return this;
    }

    /**
     * Adds a relationship definition to the schema.
     *
     * @param {string} propertyName - Name of the property representing the relationship.
     * @param {string} edgeType - Type of the edge for this relationship.
     * @param {string} description - Description of the relationship.
     * @param {string} [nodeType=null] - Optional type of node for the relationship.
     * @returns {SchemaBuilder} - Returns this for method chaining.
     */
    addRelationship(propertyName, edgeType, description, nodeType = null) {
        this.relationships.set(propertyName, {edgeType, nodeType});
        this.metadataConfig.excludeFields.push(propertyName);
        return this.addArrayProperty(propertyName, description);
    }

    /**
     * Sets whether additional properties are allowed in the schema.
     *
     * @param {boolean} allowed - Whether additional properties should be allowed.
     * @returns {SchemaBuilder} - Returns this for method chaining.
     */
    setAdditionalProperties(allowed) {
        if (!allowed) {
            this.schema.inputSchema.properties[this.schema.name.replace('add_', '')].additionalProperties = false;
        }
        return this;
    }

    /**
     * Creates an update schema based on the current schema, excluding specified fields.
     *
     * @param {Set<string>} [excludeFields=new Set()] - Fields to exclude from the update schema.
     * @returns {Object} - The complete update schema object.
     */
    createUpdateSchema(excludeFields = new Set()) {
        const updateSchemaBuilder = new SchemaBuilder(
            this.schema.name.replace('add_', 'update_'),
            `Update an existing ${this.schema.name.replace('add_', '')} in the knowledge graph`
        );

        // Copy all properties except excluded ones
        const baseProperties = this.schema.inputSchema.properties[this.schema.name.replace('add_', '')].properties;
        for (const [propName, propValue] of Object.entries(baseProperties)) {
            if (!excludeFields.has(propName)) {
                if (propValue.type === 'array') {
                    updateSchemaBuilder.addArrayProperty(propName, propValue.description);
                } else {
                    updateSchemaBuilder.addStringProperty(propName, propValue.description);
                }
            }
        }

        // Copy relationships
        for (const [propName, config] of this.relationships.entries()) {
            if (!excludeFields.has(propName)) {
                updateSchemaBuilder.addRelationship(propName, config.edgeType, config.description, config.nodeType);
            }
        }

        // Add metadata array for complete metadata replacement
        updateSchemaBuilder.addArrayProperty(
            'metadata',
            'An array of metadata contents to replace the existing metadata'
        );

        // Match additional properties setting
        updateSchemaBuilder.setAdditionalProperties(
            this.schema.inputSchema.properties[this.schema.name.replace('add_', '')].additionalProperties !== false
        );

        return updateSchemaBuilder.build();
    }

    /**
     * Builds and returns the final schema object.
     *
     * @returns {Object} - The complete schema object.
     */
    build() {
        return {
            ...this.schema,
            relationships: Object.fromEntries(this.relationships),
            metadataConfig: this.metadataConfig
        };
    }
}
