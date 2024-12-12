// src/config/config.js

import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Centralized configuration object for the MemoryMesh application.
 * @namespace
 * @property {Object} SERVER - Server configuration settings
 * @property {string} SERVER.NAME - Name of the server instance
 * @property {string} SERVER.VERSION - Current version of the server
 *
 * @property {Object} PATHS - File system paths used by the application
 * @property {string} PATHS.SCHEMAS_DIR - Directory containing schema definitions
 * @property {string} PATHS.MEMORY_FILE - Path to the memory storage file
 *
 * @property {Object} SCHEMA - Schema-related configuration
 * @property {string[]} SCHEMA.SUPPORTED_VERSIONS - List of supported schema versions
 */
export const CONFIG = {
    SERVER: {
        NAME: 'memorymesh',
        VERSION: '0.1.4',
    },

    PATHS: {
        SCHEMAS_DIR: path.join(__dirname, '..', 'config', 'schemas'),
        MEMORY_FILE: path.join(__dirname, '..', 'data', 'memory.json'),
    },

    SCHEMA: {
        SUPPORTED_VERSIONS: ['0.1', '0.2'], // TODO: Add schema versioning support
    }
};