#!/usr/bin/env node
/**
 * AuraCore MCP Server - Project & Context Management for Claude Desktop
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { initDatabase } from './database';
import {
  createProject, listProjects, getProject, updateProject,
  storeContext, queryContext, deleteContext,
  createTask, updateTask, getNextTasks,
  remember, recall, forget,
  logDecision, getDecisionHistory
} from './tools';

const server = new Server(
  {
    name: 'auracore-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ============== PROJECT TOOLS ==============
      {
        name: 'auracore_create_project',
        description: 'Create a new project to track work. Projects contain tasks and context.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Project description' },
            type: { type: 'string', enum: ['feature', 'bugfix', 'refactor', 'spike', 'maintenance'], description: 'Project type' },
            workspace_path: { type: 'string', description: 'Path to workspace directory' }
          },
          required: ['name']
        }
      },
      {
        name: 'auracore_list_projects',
        description: 'List all projects, optionally filtered by status.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['active', 'paused', 'completed', 'archived'], description: 'Filter by status' }
          }
        }
      },
      {
        name: 'auracore_get_project',
        description: 'Get detailed project information including tasks and context count.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' }
          },
          required: ['project_id']
        }
      },
      {
        name: 'auracore_update_project',
        description: 'Update project properties (name, description, status, type).',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            name: { type: 'string', description: 'New name' },
            description: { type: 'string', description: 'New description' },
            status: { type: 'string', enum: ['active', 'paused', 'completed', 'archived'] },
            type: { type: 'string', enum: ['feature', 'bugfix', 'refactor', 'spike', 'maintenance'] }
          },
          required: ['project_id']
        }
      },

      // ============== CONTEXT TOOLS ==============
      {
        name: 'auracore_store_context',
        description: 'Store business context (rules, patterns, conventions, decisions). This helps maintain persistent knowledge across conversations.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Associate with project (optional for global context)' },
            type: { type: 'string', enum: ['business_rule', 'pattern', 'convention', 'glossary', 'document', 'decision'], description: 'Context type' },
            name: { type: 'string', description: 'Context name/title' },
            content: { type: 'string', description: 'Context content (detailed description)' },
            category: { type: 'string', description: 'Category for organization' },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Priority level' }
          },
          required: ['type', 'name', 'content']
        }
      },
      {
        name: 'auracore_query_context',
        description: 'Query stored context by project, type, category, or search term. Use this to retrieve relevant business rules and patterns.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project' },
            type: { type: 'string', enum: ['business_rule', 'pattern', 'convention', 'glossary', 'document', 'decision'] },
            category: { type: 'string', description: 'Filter by category' },
            search: { type: 'string', description: 'Search in name and content' },
            limit: { type: 'number', description: 'Max results (default 20)' }
          }
        }
      },
      {
        name: 'auracore_delete_context',
        description: 'Delete a context entry by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            context_id: { type: 'string', description: 'Context ID to delete' }
          },
          required: ['context_id']
        }
      },

      // ============== TASK TOOLS ==============
      {
        name: 'auracore_create_task',
        description: 'Create a task within a project. Tasks can have dependencies and priorities.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            type: { type: 'string', enum: ['setup', 'implementation', 'testing', 'documentation'] },
            depends_on: { type: 'array', items: { type: 'string' }, description: 'Task IDs this depends on' },
            estimated_time: { type: 'string', description: 'Estimated time (e.g., "2h", "1d")' }
          },
          required: ['project_id', 'title']
        }
      },
      {
        name: 'auracore_update_task',
        description: 'Update task status, priority, or description.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task ID' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'blocked'] },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            description: { type: 'string', description: 'Updated description' }
          },
          required: ['task_id']
        }
      },
      {
        name: 'auracore_get_next_tasks',
        description: 'Get recommended next tasks for a project based on priority and status.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            limit: { type: 'number', description: 'Max tasks to return (default 3)' }
          },
          required: ['project_id']
        }
      },

      // ============== MEMORY TOOLS ==============
      {
        name: 'auracore_remember',
        description: 'Store a key-value pair in session memory. Use this to remember important information during a conversation.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Memory key' },
            value: { type: 'string', description: 'Value to remember' },
            session_id: { type: 'string', description: 'Session ID (optional, default: "default")' },
            ttl_minutes: { type: 'number', description: 'Time to live in minutes (optional, no expiry if not set)' }
          },
          required: ['key', 'value']
        }
      },
      {
        name: 'auracore_recall',
        description: 'Recall a value from session memory by key.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Memory key' },
            session_id: { type: 'string', description: 'Session ID (optional)' }
          },
          required: ['key']
        }
      },
      {
        name: 'auracore_forget',
        description: 'Remove a key from session memory.',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Memory key to forget' },
            session_id: { type: 'string', description: 'Session ID (optional)' }
          },
          required: ['key']
        }
      },

      // ============== DECISION LOG TOOLS ==============
      {
        name: 'auracore_log_decision',
        description: 'Log a decision made during development. Helps track reasoning and prevent hallucinations by recording what was decided and why.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Associated project' },
            decision_type: { type: 'string', description: 'Type of decision (e.g., "architecture", "implementation", "refactor")' },
            input_context: { type: 'string', description: 'Context that led to this decision' },
            decision: { type: 'string', description: 'The decision made' },
            confidence: { type: 'number', description: 'Confidence level 0-1' },
            reasoning: { type: 'string', description: 'Reasoning behind the decision' }
          },
          required: ['decision_type', 'decision']
        }
      },
      {
        name: 'auracore_get_decisions',
        description: 'Get decision history for a project. Use this to review past decisions and maintain consistency.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Filter by project' },
            limit: { type: 'number', description: 'Max results (default 10)' }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      // Project tools
      case 'auracore_create_project':
        result = createProject(args as any);
        break;
      case 'auracore_list_projects':
        result = listProjects((args as any)?.status);
        break;
      case 'auracore_get_project':
        result = getProject((args as any).project_id);
        break;
      case 'auracore_update_project':
        const { project_id: pid, ...updates } = args as any;
        result = updateProject(pid, updates);
        break;

      // Context tools
      case 'auracore_store_context':
        result = storeContext(args as any);
        break;
      case 'auracore_query_context':
        result = queryContext(args as any || {});
        break;
      case 'auracore_delete_context':
        result = deleteContext((args as any).context_id);
        break;

      // Task tools
      case 'auracore_create_task':
        result = createTask(args as any);
        break;
      case 'auracore_update_task':
        result = updateTask(args as any);
        break;
      case 'auracore_get_next_tasks':
        result = getNextTasks((args as any).project_id, (args as any)?.limit);
        break;

      // Memory tools
      case 'auracore_remember':
        result = remember(args as any);
        break;
      case 'auracore_recall':
        result = recall(args as any);
        break;
      case 'auracore_forget':
        result = forget((args as any).key, (args as any)?.session_id);
        break;

      // Decision log tools
      case 'auracore_log_decision':
        result = logDecision(args as any);
        break;
      case 'auracore_get_decisions':
        result = getDecisionHistory((args as any)?.project_id, (args as any)?.limit);
        break;

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true
        };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: !result.success
    };

  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  // Initialize database before starting server
  await initDatabase();
  console.error('Database initialized');

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AuraCore MCP Server running on stdio');
}

main().catch(console.error);
