// src/config/config.ts

import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to get the memory file path from command-line arguments
function getMemoryFileArg(): string | undefined {
    const argName = '--memory-file=';
    // process.argv includes the node executable and the script path as the first two elements
    // So we search from the third element onwards for arguments to the script
    for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i].startsWith(argName)) {
            return process.argv[i].substring(argName.length);
        }
        // Note: This is a simple parser. For more complex needs (e.g., --memory-file path),
        // a dedicated CLI argument parsing library like yargs or commander would be more robust.
    }
    return undefined;
}

const customMemoryPathArg = getMemoryFileArg();
let determinedMemoryFile: string;

if (customMemoryPathArg) {
    if (path.isAbsolute(customMemoryPathArg)) {
        determinedMemoryFile = customMemoryPathArg;
    } else {
        // Resolve relative paths from the current working directory
        determinedMemoryFile = path.resolve(process.cwd(), customMemoryPathArg);
    }
} else {
    // Default path if no argument is provided
    determinedMemoryFile = path.join(__dirname, '..', 'data', 'memory.jsonl');
}

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
        SCHEMAS_DIR: path.join(__dirname, '..', 'data', 'schemas'),
        /** Path to the memory JSON file. */
        MEMORY_FILE: determinedMemoryFile,
    },

    SCHEMA: {
        /** Supported schema versions (not yet implemented). */
        SUPPORTED_VERSIONS: ['0.1', '0.2'], // TODO: Add schema versioning
    },
};