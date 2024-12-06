# MemoryMesh

This project is based on the [Knowledge Graph Memory Server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) from the MCP servers repository and **preserves its base functionality**. For installation details beyond what’s provided here, refer to the original repository link above if needed. The main entry point of this application is the index.js file.

## Overview
MemoryMesh is a local knowledge graph server that can store, update, and recall structured information for AI models. Originally **tailored for text-based RPG** settings, it can also be **adapted to social networks, organizational planning, or other structured data scenarios**.

### Key Features
* **Dynamic Schema-Based Tools:** MemoryMesh supports **creating dynamic tools directly from schema definitions**. You can add a schema file, and the **server automatically generates** add_, update_, and delete_ tools for that entity type.
* **Schemas:** Allows the creation of "schemas" that **pushes AI** in generating necessary nodes (entities) throughout your sessions. _(more details below)_
* **Metadata Expansion:** Define required, optional, and enumerated fields on nodes. This structure **guides AI**, ensuring it provides the information you need.
* **Relationships Made Easy:** By including relationship definitions within schemas, **AI will be forced** to create edges and related nodes.
* **AI Awareness:** Tools are designed to **inform the AI what data is expected**. The AI can use these tools to maintain a consistent and accurate knowledge graph as the narrative or data scenario progresses.
* **Update nodes and edges**: added update tool.
* **Event Support:** An event system is in place to track operations _(still not fully tested)_.

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
The most important part of the application.
Schemas define how nodes and edges should be structured for a particular entity type. By placing a schema in `dist/config/schemas/`, MemoryMesh **automatically generates tools** `add_<nodeType>`, `update_<nodeType>`, and `delete_<nodeType>`.
File name: `[name].schema.json`

Schema Fields:
* `name` - Identifier for the schema and node type within the memory. **IMPORTANT**: The schema’s name *must* start with `add_` to be recognized.
* `description` - Used as the description for the `add_<name>` tool, providing context for the AI. *(The `delete` and `update` tools have a generic desciption)*
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
  "description": "Schema for adding an NPC to the memory." ,
  "properties": {
    "name": {
      "type": "string",
      "description": "The unique name of the NPC.",
      "required": true
    },
    "race": {
      "type": "string",
      "description": "The species or race of the NPC.",
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
For optimal results:
* Use Claude’s "Projects" feature with custom instructions
* Include information about the available tools and expected entity types.
* Instruct the AI to call these tools to keep the knowledge graph updated as stories or plans evolve.

The prompt I used for testing:
> You perform roles of an RPG bot and a Memory Manager bot.
> ALWAYS IN ORDER:
> 1. First, fulfill role Memory Manager bot to process user's input and shape planned output
> 2. Second, the role of RPG bot
> 3. Finally, Memory Manager bot again to check for any major changes that should be tracked _(NB: this rule is usually ignore)_
> 
> [Then instructions to define AI as 'Game Master' with appropriate instructions. A [resource](https://www.rpgprompts.com/post/dungeons-dragons-chatgpt-prompt) for inspiration.]
> 
> [After I provide a list all available tools with their description.]

You can always instruct AI to perform certain actions directly in the chat _(give me an artifact, make this npc an elf, etc.)_, including _"update memory"_, which I use before moving conversation to another chat when I face the _"Long chats cause..."_ tip. Then copy the last AI's message from chat, answer to it and instruct to continue the story.

What I usually do is I start a session with an empty file and ask AI to start the game, providing any info about the PC. AI adds all necessary entities on the fly as the story develops.

### Example
1. A [simple example](https://pastebin.com/0HvKg5FZ) with custom instructions.
2. An example for the sake of example, with visualization _(NOT part of the functionality)_

> Add a a couple of cities, some npcs, couple locations around the city to explore, hide an artifact or two somewhere

![image](https://github.com/user-attachments/assets/508d5903-2896-4665-a892-cdb7b81dfba6)

3. Sample [memory]()

## Installation
Installation instruction provided by Claude with MCP knowledge and modified by me after testing. I don't have experience with JS, git and coding in general and will appreciate any help in organizing this part.

### Prerequisites
Node.js 18 or higher
npm (included with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/CheMiguel23/memorymesh.git
cd memorymesh

# Install dependencies
npm install

# Build the project
npm run build

```

**IMPORTANT** from `\memorymesh\src` copy config and data folders to  created `\memorymesh\dist`

### Configure with Claude Desktop
Add this to your Claude Desktop configuration file:

#### MacOS
`~/Library/Application\ Support/Claude/claude_desktop_config.json`

```json
  "mcpServers": {
    "memorymesh": {
      "command": "/usr/local/bin/node",
      "args": [
        "/usr/local/lib/node_modules/memorymesh/dist/index.js"
      ]
    }
  }
```

#### Windows
`%APPDATA%\Claude\claude_desktop_config.json`

```json
  "mcpServers": {
    "memorymesh": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "[full_path_to_app]\\memorymesh\\dist\\index.js"
      ]
    }
  }
```

### Verify Installation
1. Restart Claude Desktop
2. Look for "memorymesh" in the MCP servers list (🔌 icon)
3. The server should show as connected

## Known Issues
1. You may occasionally see messages like "Error executing code: MCP error -32603: MCP error -32603: Error processing tool call: location "..." not found" enabled for debugging. These do not affect functionality. The AI attempts to locate existing nodes before updating them, and if none are found, it will create them after the error message.
2. AI doesn't like to delete nodes, unless instructed directly. Looking for a prompt to properly instruct it.
3. Occasionally AI adds information in generic metada field that fits better in set properties, you can try `additionalProperties: false` to prevent that.

## Contribution
This project is a personal exploration into integrating structured data with AI reasoning capabilities. Contributions, feedback, and ideas are welcome to push it further or inspire new projects.

95% of coding done by Claude, 95% of documentation done by ChatGPT.
