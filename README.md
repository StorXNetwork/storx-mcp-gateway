StorX MCP Server
A Model Context Protocol (MCP) server that enables AI models to interact with StorX S3-compatible storage. This server provides a set of tools for managing your StorX storage buckets and objects through AI models like Claude and local LLMs.

What is MCP?
The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to Large Language Models (LLMs). Think of MCP like a USB-C port for AI applications - it provides a standardized way to connect AI models to different data sources and tools.

Features
1. List and manage buckets
2. Upload, download, and manage objects
3. Generate signed URLs for secure access
4. Support for Claude.
5. Simple configuration through JSON

Prerequisites
    Node.js 16+
    Access to an StorX account with:
        Access Key ID
        Secret Access Key
        Endpoint URL

Steps to Install and Run the code 
1. Clone the repository using the git clone method.
2. Open the file in the VSCode/any code Editor.
3. Create a package.json file and add this data into the package.json
{
    "name": "storx-mcp-server",
    "version": "0.1.0",
    "description": "MCP server for Storx decentralized storage",
    "type": "module",
    "main": "index.js",
    "bin": {
        "storx-mcp-server": "./index.js"
    },
    "scripts": {
        "start": "node index.js",
        "dev": "node --inspect index.js"
    },
    "dependencies": {
        "@aws-sdk/client-s3": "^3.654.0",
        "@modelcontextprotocol/sdk": "^0.4.0",
        "dotenv": "^16.5.0"
    },
    "keywords": [
        "mcp",
        "storx",
        "storage",
        "decentralized"
    ],
    "author": "Storx",
    "license": "MIT"
}

4. Now open the terminal and run the command below to install packages and node modules.
    npm install

Usage with Claude Desktop
1. Download and install Claude for Desktop (macOS or Windows)
2. Open Claude Desktop Settings:

    Click on the Claude menu
    Select "Settings..."
    Click on "Developer" in the left-hand bar
    Click on "Edit Config"
3. This will create/update the configuration file at:

        macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
        Windows: %APPDATA%\Claude\claude_desktop_config.json
4. Add the StorX MCP server configuration to the file:
{
  "mcpServers": {
    "storx": {
      "command": "node",
      "args": ["path\to\index.js"],
      "env": {
        "STORX_ACCESS_KEY": "Your_access_Key",
        "STORX_SECRET_KEY": "Your_secret_key"
      }
    }
  }
}
5. Restart Claude Desktop
6. You should see a slider icon in the bottom left corner of the input box. Click it to see the available StorX tools.

Now you will be able to :
1. list_buckets
2. list_objects
3. upload_objects
4. download_object
5. delete_object
6. create_bucket