#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration from claude_desktop_config.json
function loadConfig() {
  // Try multiple possible paths for claude_desktop_config.json
  const possiblePaths = [
    join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), // macOS
    join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'), // Windows
    join(homedir(), '.config', 'Claude', 'claude_desktop_config.json'), // Linux
    join(__dirname, 'claude_desktop_config.json'), // Current directory
    join(process.cwd(), 'claude_desktop_config.json'), // Working directory
  ];

  let configPath = null;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      configPath = path;
      break;
    }
  }

  if (!configPath) {
    console.error('ERROR: claude_desktop_config.json file not found!');
    console.error('Searched in the following locations:');
    possiblePaths.forEach(path => console.error(`  - ${path}`));
    console.error('\nPlease ensure claude_desktop_config.json exists in one of these locations.');
    console.error('The file should contain your Storx MCP server configuration under the mcpServers section.');
    process.exit(1);
  }

  try {
    const configData = readFileSync(configPath, 'utf8');
    const fullConfig = JSON.parse(configData);
    
    // Extract Storx MCP server config from claude_desktop_config.json
    // Expected structure: { "mcpServers": { "storx": { "env": { ... } } } }
    const mcpServers = fullConfig.mcpServers || {};
    const storxConfig = mcpServers.storx || mcpServers['storx-mcp-server'] || {};
    const envConfig = storxConfig.env || {};
    
    // Map environment variables to our expected format
    const config = {
      accessKey: envConfig.STORX_ACCESS_KEY || envConfig.AWS_ACCESS_KEY_ID,
      secretKey: envConfig.STORX_SECRET_KEY || envConfig.AWS_SECRET_ACCESS_KEY,
      endpoint: envConfig.STORX_ENDPOINT || envConfig.AWS_ENDPOINT_URL || 'https://gateway.storx.io',
      region: envConfig.STORX_REGION || envConfig.AWS_REGION || 'us-east-1'
    };
    
    // Validate required fields
    const requiredFields = ['accessKey', 'secretKey'];
    const missing = requiredFields.filter(field => !config[field]);
    
    if (missing.length > 0) {
      console.error('ERROR: Invalid configuration in claude_desktop_config.json');
      console.error('Missing environment variables for Storx MCP server:');
      missing.forEach(field => {
        const envVarName = field === 'accessKey' ? 'STORX_ACCESS_KEY or AWS_ACCESS_KEY_ID' : 'STORX_SECRET_KEY or AWS_SECRET_ACCESS_KEY';
        console.error(`  - ${envVarName}`);
      });
      console.error('\nExample configuration in claude_desktop_config.json:');
      console.error(`{
  "mcpServers": {
    "storx": {
      "command": "node",
      "args": ["path/to/your/index.js"],
      "env": {
        "STORX_ACCESS_KEY": "your_access_key_here",
        "STORX_SECRET_KEY": "your_secret_key_here",
        "STORX_ENDPOINT": "https://gateway.storx.io",
        "STORX_REGION": "us-east-1"
      }
    }
  }
}`);
      process.exit(1);
    }
    
    console.error(`Loaded configuration from: ${configPath}`);
    return config;
  } catch (error) {
    console.error('ERROR: Failed to parse claude_desktop_config.json');
    console.error('Please ensure it contains valid JSON format.');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Load and validate configuration
const config = loadConfig();

// Configure Storx client
const STORX_CONFIG = {
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
  },
  endpoint: config.endpoint,
  region: config.region,
  forcePathStyle: true,
};

// Initialize S3 client for Storx
const s3Client = new S3Client(STORX_CONFIG);

class StorxMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "storx-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_buckets",
          description: "List all buckets in Storx storage",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_objects",
          description: "List objects in a specific bucket",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "Name of the bucket to list objects from",
              },
              prefix: {
                type: "string",
                description: "Optional prefix to filter objects",
              },
            },
            required: ["bucket"],
          },
        },
        {
          name: "upload_object",
          description: "Upload an object to Storx storage",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "Name of the bucket",
              },
              key: {
                type: "string",
                description: "Object key/filename",
              },
              content: {
                type: "string",
                description: "Content to upload (text)",
              },
              contentType: {
                type: "string",
                description: "MIME type of the content",
                default: "text/plain",
              },
            },
            required: ["bucket", "key", "content"],
          },
        },
        {
          name: "download_object",
          description: "Download an object from Storx storage",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "Name of the bucket",
              },
              key: {
                type: "string",
                description: "Object key/filename",
              },
            },
            required: ["bucket", "key"],
          },
        },
        {
          name: "delete_object",
          description: "Delete an object from Storx storage",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "Name of the bucket",
              },
              key: {
                type: "string",
                description: "Object key/filename to delete",
              },
            },
            required: ["bucket", "key"],
          },
        },
        {
          name: "create_bucket",
          description: "Create a new bucket in Storx storage",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "Name of the bucket to create",
              },
            },
            required: ["bucket"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "list_buckets":
            return await this.listBuckets();
          
          case "list_objects":
            return await this.listObjects(request.params.arguments);
          
          case "upload_object":
            return await this.uploadObject(request.params.arguments);
          
          case "download_object":
            return await this.downloadObject(request.params.arguments);
          
          case "delete_object":
            return await this.deleteObject(request.params.arguments);
          
          case "create_bucket":
            return await this.createBucket(request.params.arguments);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async listBuckets() {
    try {
      const command = new ListBucketsCommand({});
      const result = await s3Client.send(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${result.Buckets.length} buckets:\n${result.Buckets
              .map(bucket => `- ${bucket.Name} (created: ${bucket.CreationDate})`)
              .join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list buckets: ${error.message}`);
    }
  }

  async listObjects(args) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: args.bucket,
        Prefix: args.prefix || '',
      });
      
      const result = await s3Client.send(command);
      
      if (!result.Contents || result.Contents.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No objects found in bucket '${args.bucket}'${args.prefix ? ` with prefix '${args.prefix}'` : ''}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Found ${result.Contents.length} objects in '${args.bucket}':\n${result.Contents
              .map(obj => `- ${obj.Key} (${obj.Size} bytes, modified: ${obj.LastModified})`)
              .join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to list objects: ${error.message}`);
    }
  }

  async uploadObject(args) {
    try {
      const command = new PutObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
        Body: args.content,
        ContentType: args.contentType || 'text/plain',
      });

      await s3Client.send(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully uploaded '${args.key}' to bucket '${args.bucket}'`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to upload object: ${error.message}`);
    }
  }

  async downloadObject(args) {
    try {
      const command = new GetObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
      });

      const result = await s3Client.send(command);
      const content = await result.Body.transformToString();
      
      return {
        content: [
          {
            type: "text",
            text: `Content of '${args.key}' from bucket '${args.bucket}':\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to download object: ${error.message}`);
    }
  }

  async deleteObject(args) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
      });

      await s3Client.send(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted '${args.key}' from bucket '${args.bucket}'`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to delete object: ${error.message}`);
    }
  }

  async createBucket(args) {
    try {
      const command = new CreateBucketCommand({
        Bucket: args.bucket,
      });

      await s3Client.send(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully created bucket '${args.bucket}'`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Storx MCP server running on stdio");
  }
}

const server = new StorxMCPServer();
server.run().catch(console.error);