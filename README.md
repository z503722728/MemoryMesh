# MemoryMesh

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![smithery badge](https://smithery.ai/badge/memorymesh)](https://smithery.ai/protocol/memorymesh) 

This project is based on the [Knowledge Graph Memory Server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) from the MCP servers repository and retains its core functionality. For installation details beyond what’s provided here, refer to the original repository link above if needed. The main entry point of this application is the index.ts file.

## Overview

MemoryMesh is a local knowledge graph server designed to help you build and manage structured information for AI models. It's particularly well-suited for text-based RPG settings but can be easily adapted for other applications like social network simulations, organizational planning, or any scenario involving structured data.

MemoryMesh is built to work seamlessly with AI. Its **dynamic schema-based tools**, **metadata expansion** features, and focus on relationships allow AI easily understand and interact with the memory.

### Key Features

* **Dynamic Schema-Based Tools:** MemoryMesh supports **creating dynamic tools directly from schema definitions**. You can add a schema file, and the **server automatically generates** add_, update_, and delete_ tools for that entity type.
* **Schemas:** Allows the creation of "schemas" that **pushes AI** in generating necessary nodes (entities) throughout your sessions. A separate tool included! _(more details below)_
* **Metadata Expansion:** Define required, optional, and enumerated fields on nodes. This structure **guides AI**, ensuring it provides the information you need.
* **Relationships Made Easy:** By including relationship definitions within schemas, **AI will be forced** to create edges and related nodes.
* **AI Awareness:** Tools are designed to **inform the AI about the data that is expected**. The AI can use these tools to maintain a consistent and accurate knowledge graph as the narrative or data scenario progresses.
* **Update nodes and edges**: An update tool has been added to modify nodes and edges.
* **Event Support:** An event system is in place to track operations.
* **Informative error feedback** to the AI, helping it understand and potentially self-correct when tool calls fail.

### Nodes and edges

Nodes represent entities or concepts. Each node includes:

* `name`: A unique identifier for the node.
* `nodeType`: Category or type of the node (e.g., `npc`, `artifact`, `location`)
* `metadata`: Array of strings containing descriptive details.
```json
    {
      "name": "Aragorn",
      "nodeType": "player_character",
      "metadata": [
        "Race: Human",
        "Class: Ranger",
        "Skills: Tracking, Swordsmanship",
        "Affiliation: Fellowship of the Ring"
      ]
    }
```

#### Edges

Edges represent relationships between nodes:
* `from`: Source node’s name
* `to`: Target node’s name
* `edgeType`: Type of relationship (e.g., `owns`, `located_in`)
```json
{
  "from": "Aragorn",
  "to": "Andúril",
  "edgeType": "owns"
}
```

### Schemas

#### SchemaManager tool - an easy way to create and edit your schemas!

[SchemaManager tool](https://github.com/CheMiguel23/MemoryMesh/blob/main/SchemaManager.html) included in the repository to simplify schema creation and editing.

Try it out! It provides a visual interface for defining your schemas, making the process much more intuitive. See the [guide](https://github.com/CheMiguel23/MemoryMesh/discussions/3)  for detailed instructions.

<img width="370" alt="image" src="https://github.com/user-attachments/assets/e8f0c808-2ff6-48da-ac7c-cf51aebde7b8">

#### Details

The most important part of the application.
Schemas define how nodes and edges should be structured for a particular entity type. By placing a schema in `dist/config/schemas/`, MemoryMesh **automatically generates tools** `add_<nodeType>`, `update_<nodeType>`, and `delete_<nodeType>`.
File name: `[name].schema.json`

Schema Fields:
* `name` - Identifier for the schema and node type within the memory. **IMPORTANT**: The schema’s name *must* start with `add_` to be recognized.
* `description` - Used as the description for the `add_<name>` tool, providing context for the AI. *(The `delete` and `update` tools have a generic description)*
* `properties` - Each property includes its type, description, and additional constraints.
    * `property`
        * `type` - Supported values are `string` or `array`.
        * `description` - Helps guide the AI on the entity’s purpose.
        * `required` - Boolean. If `true`, the **AI is forced** to provide this property when creating a node.
        * `enum` - An array of strings. If present, the **AI must choose** one of the given options.
        * `relationship` - Defines a connection to another node. If a property is required and has a relationship, the **AI will always create** both the node and the corresponding edge.
            * `edgeType` - Type of the relationship to be created.
            * `description` - Helps guide the AI on the relationship’s purpose.
* `additionalProperties` - Boolean. If `true`, allows the AI to add extra attributes beyond those defined as required or optional.

#### Schema Implementation and example

```json
{
  "name": "add_npc",
  "description": "Schema for adding an NPC to the memory" ,
  "properties": {
    "name": {
      "type": "string",
      "description": "A unique identifier for the NPC",
      "required": true
    },
    "race": {
      "type": "string",
      "description": "The species or race of the NPC",
      "required": true,
      "enum": [
        "Human",
        "Elf",
        "Dwarf",
        "Orc",
        "Goblin"
      ]
    },
    "currentLocation": {
      "type": "string",
      "description": "The current location of the NPC",
      "required": true,
      "relationship": {
        "edgeType": "located_in",
        "description": "The current location of the NPC"
      }
    }
  },
  "additionalProperties": true
}
```

With this schema, the server creates the following tools:
* `add_npc`
* `update_npc`
* `delete_npc`

**IMPORTANT:** This repository includes 11 RPG-theme schemas that you can freely explore, modify and create your own! 

### Memory file

By default, data is stored in a JSON file in `dist/data/memory.json`.

## Custom implementation

To add a new entity type:
1. Create a schema file in `dist/config/schemas/` (e.g., city.schema.json).
2. Restart the server.
3. The dynamic tools (add_city, update_city, delete_city) will be available automatically.

## Memory Flow

![image](https://github.com/user-attachments/assets/27519003-c1e6-448a-9fdb-cd0a0009f67d)

## Prompt

For optimal results, use Claude's "Projects" feature with custom instructions. Here's an example of a prompt you can start with:

```
You are a helpful AI assistant managing a knowledge graph for a text-based RPG. You have access to the following tools: add_npc, update_npc, delete_npc, add_location, update_location, delete_location, and other tools for managing the game world.

When the user provides input, first process it using your available tools to update the knowledge graph. Then, respond in a way that is appropriate for a text-based RPG.
```
Trivial Example Interactions:

```
User: "Start a new game. I want to play a human ranger named Aragorn."

(AI - behind the scenes): Use add_player_character to create a node for Aragorn with the appropriate metadata.

(AI - response): "You begin your adventure as Aragorn, a skilled human ranger. What is your first move?"

User: "Create a new city called 'Minas Tirith'."

(AI - behind the scenes): Use add_city to create a node for Minas Tirith.

(AI - response): "The great city of Minas Tirith has been added to the world. It is known for..."

User: "Aragorn is now in Minas Tirith."

(AI - behind the scenes): Use update_player_character to update Aragorn's currentLocation to Minas Tirith.

(AI - response): "Aragorn has arrived in Minas Tirith. What would you like to do here?"
```

You can also instruct the AI to perform specific actions directly in the chat, such as:
```
"Give the player an artifact called the 'One Ring'."
```
```
"Make the NPC 'Gandalf' a wizard."
```
```
"Update the memory with the latest events." (Useful before switching to a new chat)
```
Experiment with different prompts to find what works best for your use case!

### Example
1. A [simple example](https://pastebin.com/0HvKg5FZ) with custom instructions.
2. An example for the sake of example, with visualization _(NOT part of the functionality)_

> Add a couple of cities, some npcs, couple locations around the city to explore, hide an artifact or two somewhere

![image](https://github.com/user-attachments/assets/508d5903-2896-4665-a892-cdb7b81dfba6)

## Installation

### Prerequisites

*   **Node.js:** Version 18 or higher. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm:**  Usually included with Node.js.
*   **Claude for Desktop:**  Make sure you have the latest version installed from [claude.ai/download](https://claude.ai/download).

### Installation Steps

1. **Clone the Repository:**

    ```bash
    git clone https://github.com/CheMiguel23/memorymesh.git
    cd memorymesh
    ```

2. **Install Dependencies:**

    ```bash
    npm install
    ```

3. **Build the Project:**

    ```bash
    npm run build
    ```
   This command compiles the TypeScript code into JavaScript in the `dist` directory and copies sample schema and data files into it as well.

4. **Verify File Copy (Optional):**

    *   The build process should automatically copy the `config` and `data` folders to `dist`.
    *   **Check** that `dist/config` and `dist/data` exist and contain `.json` files.

5. **Configure Claude Desktop:**

   Open your Claude Desktop configuration file:

    * **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
    * **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
    * Add an entry for `memorymesh` to the `mcpServers` section. You can choose **one** of the following configuration options:

    ```json
    "mcpServers": {
      "memorymesh": {
        "command": "node", 
        "args": ["/ABSOLUTE/PATH/TO/YOUR/PROJECT/memorymesh/dist/index.js"]
      }
    }
    ```

    *   Replace `/ABSOLUTE/PATH/TO/YOUR/PROJECT/` with the **actual absolute path** to your `memorymesh` project directory.
    *   **Example (macOS):**
        ```json
        "command": "node",
        "args": ["/Users/yourusername/Projects/memorymesh/dist/index.js"]
        ```
    *   **Example (Windows):**
        ```json
        "command": "node",
        "args": ["C:\\Projects\\memorymesh\\dist\\index.js"]
        ```

6. **Restart Claude Desktop:** Completely restart Claude Desktop for the changes to take effect.

### Verify Installation

1. Start Claude Desktop.
2. Open a new chat.
3. Look for the MCP plugin icon <img src="https://mintlify.s3.us-west-1.amazonaws.com/mcp/images/claude-desktop-mcp-plug-icon.svg"/> in the top-right corner. If it's there, your configuration is likely correct.
4. Click the <img src="https://mintlify.s3.us-west-1.amazonaws.com/mcp/images/claude-desktop-mcp-plug-icon.svg"/> icon. You should see "memorymesh" in the list of connected servers.
5. Click the <img src="https://mintlify.s3.us-west-1.amazonaws.com/mcp/images/claude-desktop-mcp-hammer-icon.svg"/> icon. If you see tools listed (e.g., `add_npc`, `update_npc`, etc.), your server is working and exposing tools correctly.

### Troubleshooting

*   **Server not appearing in Claude:**
    *   Double-check the paths in your `claude_desktop_config.json`. Make sure they are absolute paths and correct.
    *   Verify that the `dist` directory exists and contains the compiled JavaScript files, including `index.js`.
    *   Check the Claude Desktop logs for errors:
        *   **macOS:** `~/Library/Logs/Claude/mcp-server-memorymesh.log` (and `mcp.log`)
        *   **Windows:** (Likely in a `Logs` folder under `%AppData%\Claude`)

*   **Tools not showing up:**
    *   Make sure your `npm run build` command completed without errors.
    *   Verify that your schema files are correctly placed in `dist/config/schemas` and follow the correct naming convention (`add_[entity].schema.json`).
    *   Check your server's console output or logs for any errors during initialization.

### Installing via Smithery

To install MemoryMesh for Claude Desktop automatically via [Smithery](https://smithery.ai/protocol/memorymesh):

```bash
npx @smithery/cli install memorymesh --client claude
```

## Limitations

1. **Node Deletion:** The AI may be reluctant to delete nodes from the knowledge graph.

## Contribution

This project is a personal exploration into integrating structured data with AI reasoning capabilities. Contributions, feedback, and ideas are welcome to push it further or inspire new projects.