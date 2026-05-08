/**
 * @fileoverview Stdio transport for MCP (used by Claude Code's local plugin).
 *
 * Connects an MCP server to stdin/stdout for communication with a parent process.
 * This is the default transport when Claude Code spawns the server as a child process.
 *
 * Communication format: Line-delimited JSON-RPC 2.0 over stdio.
 * - Client (Claude Code) writes JSON-RPC requests to the server's stdin
 * - Server writes JSON-RPC responses to stdout
 * - Diagnostic messages (boot, logs, errors) go to stderr
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Connects an MCP server to stdin/stdout and starts the message loop.
 *
 * Process:
 * 1. Create a StdioServerTransport (handles JSON-RPC over stdin/stdout)
 * 2. Connect the server to the transport (starts listening for incoming messages)
 * 3. Write a boot message to stderr (signals to the parent process that the server is ready)
 *
 * The function never returns (the server waits indefinitely for messages on stdin).
 * The parent process (Claude Code) controls when to terminate the server by closing stdin
 * or killing the process.
 *
 * Why stderr for boot message: Prevents JSON-RPC responses from being mixed with
 * diagnostic output. The MCP client expects stdout to contain only valid JSON-RPC messages;
 * boot and log messages go to stderr so they don't interfere with the message channel.
 *
 * Why JSON format for boot message: Allows Claude Code to parse diagnostic info
 * (connection status, errors) in a structured way.
 *
 * @param server MCP server instance (already built and with tools registered)
 * @returns Promise that never resolves (waits indefinitely for requests)
 */
export async function runStdio(server: McpServer): Promise<void> {
  // Create and connect the stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Signal to the parent process (Claude Code) that the server is ready
  // This allows Claude Code to proceed with listing tools and handling requests
  process.stderr.write(
    `${JSON.stringify({ kind: "zerogpu.boot", transport: "stdio" })}\n`,
  );
}
