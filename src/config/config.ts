// src/config/config.ts

import path from 'path';
import { isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = minimist(process.argv.slice(2));

/**
 * Determines the absolute path for a configuration file/directory.
 * Priority:
 * 1. Command line argument
 * 2. Environment variable
 * 3. Default path
 *
 * @param argName The name of the command line argument (e.g., 'memory-path').
 * @param envVarName The name of the environment variable (e.g., 'MEMORY_FILE_PATH').
 * @param defaultPathSegments Segments to join with __dirname for the default path (e.g., ['..', 'data', 'memory.jsonl']).
 * @returns The determined absolute path.
 */
function determinePath(argName: string, envVarName: string, defaultPathSegments: string[]): string {
    let customPath = argv[argName] || process.env[envVarName];

    if (customPath) {
        if (isAbsolute(customPath)) {
            return customPath;
        }
        return path.resolve(process.cwd(), customPath);
    }
    return path.join(__dirname, ...defaultPathSegments);
}

const determinedMemoryFile = determinePath('memory-path', 'MEMORY_FILE_PATH', ['..', 'data', 'memory.jsonl']);
const determinedSchemasDir = determinePath('schemas-path', 'SCHEMAS_DIR_PATH', ['..', 'data', 'schemas']);

interface ServerConfig {
    NAME: string;
    VERSION: string;
}

interface PathsConfig {
    SCHEMAS_DIR: string;
    MEMORY_FILE: string;
}

interface SchemaConfig {
    SUPPORTED_VERSIONS: string[];
}

interface Config {
    SERVER: ServerConfig;
    PATHS: PathsConfig;
    SCHEMA: SchemaConfig;
}

/**
 * Centralized configuration for MemoryMesh.
 */
export const CONFIG: Config = {
    SERVER: {
        NAME: 'memorymesh',
        VERSION: '0.2.8',
    },

    PATHS: {
        /** Path to schema files directory. */
        SCHEMAS_DIR: determinedSchemasDir,
        /** Path to the memory JSON file. */
        MEMORY_FILE: determinedMemoryFile,
    },

    SCHEMA: {
        /** Supported schema versions (not yet implemented). */
        SUPPORTED_VERSIONS: ['0.1', '0.2'], // TODO: Add schema versioning
    },
};