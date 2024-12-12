// src/schema/loader/schemaLoader.js
import {promises as fs} from 'fs';
import {SchemaBuilder} from './schemaBuilder.js';
import {fileURLToPath} from 'url';
import path from 'path';
import {CONFIG} from '../../config/config.js';

/**
 * @class SchemaLoader
 * @classdesc Responsible for loading and converting schema definitions from JSON files into SchemaBuilder instances.
 */
export class SchemaLoader {
    /**
     * Loads a specific schema by name.
     *
     * @param {string} schemaName - The name of the schema to load.
     * @returns {Promise<Object>} - The SchemaBuilder instance representing the loaded schema.
     * @throws {Error} If reading or parsing the schema file fails.
     */
    static async loadSchema(schemaName) {
        const SCHEMAS_DIR = CONFIG.PATHS.SCHEMAS_DIR;
        const schemaPath = path.join(SCHEMAS_DIR, `${schemaName}.schema.json`);
        const schemaContent = await fs.readFile(schemaPath, 'utf-8');
        const schema = JSON.parse(schemaContent);

        return this.convertToSchemaBuilder(schema);
    }

    /**
     * Converts a JSON schema object into a SchemaBuilder instance.
     *
     * @param {Object} schema - The JSON schema object to convert.
     * @returns {SchemaBuilder} - The resulting SchemaBuilder instance.
     */
    static convertToSchemaBuilder(schema) {
        const builder = new SchemaBuilder(schema.name, schema.description);

        for (const [propName, propConfig] of Object.entries(schema.properties)) {
            if (propConfig.type === 'array') {
                builder.addArrayProperty(
                    propName,
                    propConfig.description,
                    propConfig.required,
                    propConfig.enum
                );
            } else {
                builder.addStringProperty(
                    propName,
                    propConfig.description,
                    propConfig.required,
                    propConfig.enum
                );
            }

            // Add relationship if defined
            if (propConfig.relationship) {
                builder.addRelationship(
                    propName,
                    propConfig.relationship.edgeType,
                    propConfig.relationship.description
                );
            }
        }

        if (schema.additionalProperties !== undefined) {
            builder.setAdditionalProperties(schema.additionalProperties);
        }

        return builder;
    }

    /**
     * Loads all schema files from the schemas directory.
     *
     * @returns {Promise<Object>} - An object mapping schema names to their respective SchemaBuilder instances.
     * @throws {Error} If reading the schemas directory or parsing any schema file fails.
     */
    static async loadAllSchemas() {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const SCHEMAS_DIR = path.join(__dirname, '..', '..', 'config', 'schemas');
        const files = await fs.readdir(SCHEMAS_DIR);
        const schemaFiles = files.filter(file => file.endsWith('.schema.json'));

        const schemas = {};
        for (const file of schemaFiles) {
            const schemaName = path.basename(file, '.schema.json');
            schemas[schemaName] = await this.loadSchema(schemaName);
        }

        return schemas;
    }
}
