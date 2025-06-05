# StorX MCP Gateway

A Model Context Protocol (MCP) server that enables AI models (like Claude and local LLMs) to interact with StorX S3-compatible distributed storage. This server exposes a set of tools for managing your StorX storage buckets (vaults) and objects.

---

## What is MCP?

The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to Large Language Models (LLMs). Think of MCP like a USB-C port for AI applications—it provides a standardized way to connect AI models to different data sources and tools.

---

## Features

- List and manage buckets (vaults)
- Upload, download, and manage objects
- Create and delete buckets (vaults)
- Simple configuration through JSON
- Secure, S3-compatible access to StorX
- Designed for integration with Claude Desktop and other MCP-compatible clients

---

## Prerequisites

- Node.js 16+
- Access to a StorX account with:
  - Access Key ID
  - Secret Access Key

---

## Installation & Usage

You do **not** need to clone or build this repo. You can run the MCP server directly using `npx`:

```jsonc
// Example Claude Desktop config (claude_desktop_config.json)
"storx": {
  "command": "npx",
  "args": [
    "-y",
    "@storxnetwork/storx-mcp-gateway@latest"
  ],
  "env": {
    "STORX_ACCESS_KEY": "your_access_key_here",
    "STORX_SECRET_KEY": "your_secret_key_here"
  }
}
```

### 1. With Claude Desktop

1. Download and install Claude for Desktop (macOS or Windows)
2. Open Claude Desktop Settings:
    - Click on the Claude menu
    - Select "Settings..."
    - Click on "Developer" in the left-hand bar
    - Click on "Edit Config"
3. Add the above StorX MCP server configuration to the file:
    - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
4. Restart Claude Desktop
5. You should see a slider icon in the bottom left corner of the input box. Click it to see the available StorX tools.

---

## Available Commands (Tools)

The following tools are available via MCP and can be called by AI models or other MCP clients:

| Tool Name        | Description                                                                 | Required Arguments                | Optional Arguments         |
|------------------|-----------------------------------------------------------------------------|-----------------------------------|---------------------------|
| list_buckets     | List all buckets (vaults) in StorX storage                                  | _none_                            | _none_                    |
| list_objects     | List objects in a specific bucket (vault)                                   | `bucket` (string)                 | `prefix` (string)         |
| upload_object    | Upload an object to a specific bucket (vault)                               | `bucket`, `key`, `content`        | `contentType` (string)    |
| download_object  | Download an object from a specific bucket (vault)                           | `bucket`, `key`                   | _none_                    |
| delete_object    | Delete an object from a specific bucket (vault)                             | `bucket`, `key`                   | _none_                    |
| create_bucket    | Create a new bucket (vault) in StorX storage                                | `bucket` (string)                 | _none_                    |

### Argument Details

- **bucket**: Name of the bucket/vault/remote storage
- **key**: Object key/filename or file path
- **content**: Content to upload (text or bytes)
- **contentType**: MIME type of the content (default: `text/plain`)
- **prefix**: Optional prefix to filter objects or file path

---

## Example Usage

### List all vaults

```json
{
  "tool": "list_buckets"
}
```

### List objects in a vault

```json
{
  "tool": "list_objects",
  "arguments": {
    "bucket": "my-vault"
  }
}
```

### Upload a file

```json
{
  "tool": "upload_object",
  "arguments": {
    "bucket": "my-vault",
    "key": "hello.txt",
    "content": "Hello, StorX!"
  }
}
```

### Download a file

```json
{
  "tool": "download_object",
  "arguments": {
    "bucket": "my-vault",
    "key": "hello.txt"
  }
}
```

### Delete a file

```json
{
  "tool": "delete_object",
  "arguments": {
    "bucket": "my-vault",
    "key": "hello.txt"
  }
}
```

### Create a new vault

```json
{
  "tool": "create_bucket",
  "arguments": {
    "bucket": "new-vault"
  }
}
```

---

## Security

- **Never share your access keys publicly.**
- Use environment variables or secure config files to store your credentials.

---

## License

MIT

---

If you need more advanced usage or want to run the server locally for development, clone the repo and run:

```sh
npm install
npm start
```