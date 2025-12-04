/**
 * AuraCore MCP - Type Definitions
 */

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'feature' | 'bugfix' | 'refactor' | 'spike' | 'maintenance';
  status: 'active' | 'paused' | 'completed' | 'archived';
  workspace_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Context {
  id: string;
  project_id?: string;
  type: 'business_rule' | 'pattern' | 'convention' | 'glossary' | 'document' | 'decision';
  name: string;
  content: string;
  category?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type?: 'setup' | 'implementation' | 'testing' | 'documentation';
  depends_on?: string[];
  estimated_time?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SessionMemory {
  id: string;
  session_id: string;
  key: string;
  value: string;
  created_at: string;
  expires_at?: string;
}

export interface DecisionLog {
  id: string;
  project_id?: string;
  decision_type: string;
  input_context?: string;
  decision: string;
  confidence?: number;
  reasoning?: string;
  was_correct?: boolean;
  created_at: string;
}

// Tool input schemas
export interface CreateProjectInput {
  name: string;
  description?: string;
  type?: Project['type'];
  workspace_path?: string;
}

export interface StoreContextInput {
  project_id?: string;
  type: Context['type'];
  name: string;
  content: string;
  category?: string;
  priority?: Context['priority'];
}

export interface QueryContextInput {
  project_id?: string;
  type?: Context['type'];
  category?: string;
  search?: string;
  limit?: number;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  priority?: Task['priority'];
  type?: Task['type'];
  depends_on?: string[];
  estimated_time?: string;
}

export interface UpdateTaskInput {
  task_id: string;
  status?: Task['status'];
  priority?: Task['priority'];
  description?: string;
}

export interface RememberInput {
  key: string;
  value: string;
  session_id?: string;
  ttl_minutes?: number;
}

export interface RecallInput {
  key: string;
  session_id?: string;
}

export interface LogDecisionInput {
  project_id?: string;
  decision_type: string;
  input_context?: string;
  decision: string;
  confidence?: number;
  reasoning?: string;
}
