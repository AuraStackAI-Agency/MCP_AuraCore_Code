/**
 * AuraCore MCP - Tool Implementations
 * Uses sql.js helpers from database.ts
 */
import { runAndSave, queryAll, queryOne } from './database';
import { v4 as uuidv4 } from 'uuid';
import {
  Project, Context, Task,
  CreateProjectInput, StoreContextInput, QueryContextInput,
  CreateTaskInput, UpdateTaskInput,
  RememberInput, RecallInput, LogDecisionInput
} from './types';

// ============== PROJECT TOOLS ==============

export function createProject(input: CreateProjectInput): { success: boolean; project?: Project; error?: string } {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    runAndSave(
      `INSERT INTO projects (id, name, description, type, status, workspace_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
      [id, input.name, input.description || null, input.type || 'feature', input.workspace_path || null, now, now]
    );

    const project = queryOne<Project>('SELECT * FROM projects WHERE id = ?', [id]);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function listProjects(status?: string): { success: boolean; projects?: Project[]; error?: string } {
  try {
    let query = 'SELECT * FROM projects';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY updated_at DESC';

    const projects = queryAll<Project>(query, params.length > 0 ? params : undefined);
    return { success: true, projects };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function getProject(project_id: string): { success: boolean; project?: Project; tasks?: Task[]; context_count?: number; error?: string } {
  try {
    const project = queryOne<Project>('SELECT * FROM projects WHERE id = ?', [project_id]);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    const tasks = queryAll<Task>('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at', [project_id]);
    const contextCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM context WHERE project_id = ?', [project_id]);

    return { success: true, project, tasks, context_count: contextCount?.count || 0 };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function updateProject(project_id: string, updates: Partial<Project>): { success: boolean; project?: Project; error?: string } {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.type) { fields.push('type = ?'); values.push(updates.type); }

    if (fields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(project_id);

    runAndSave(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);

    const project = queryOne<Project>('SELECT * FROM projects WHERE id = ?', [project_id]);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============== CONTEXT TOOLS ==============

export function storeContext(input: StoreContextInput): { success: boolean; context?: Context; error?: string } {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    runAndSave(
      `INSERT INTO context (id, project_id, type, name, content, category, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.project_id || null, input.type, input.name, input.content, input.category || null, input.priority || 'medium', now, now]
    );

    const context = queryOne<Context>('SELECT * FROM context WHERE id = ?', [id]);
    return { success: true, context };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function queryContext(input: QueryContextInput): { success: boolean; results?: Context[]; error?: string } {
  try {
    let query = 'SELECT * FROM context WHERE 1=1';
    const params: any[] = [];

    if (input.project_id) {
      query += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(input.project_id);
    }

    if (input.type) {
      query += ' AND type = ?';
      params.push(input.type);
    }

    if (input.category) {
      query += ' AND category = ?';
      params.push(input.category);
    }

    if (input.search) {
      query += ' AND (name LIKE ? OR content LIKE ?)';
      const searchTerm = `%${input.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY priority DESC, updated_at DESC';
    query += ` LIMIT ${input.limit || 20}`;

    const results = queryAll<Context>(query, params.length > 0 ? params : undefined);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function deleteContext(context_id: string): { success: boolean; error?: string } {
  try {
    // Check if exists first
    const existing = queryOne<Context>('SELECT id FROM context WHERE id = ?', [context_id]);
    if (!existing) {
      return { success: false, error: 'Context not found' };
    }
    runAndSave('DELETE FROM context WHERE id = ?', [context_id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============== TASK TOOLS ==============

export function createTask(input: CreateTaskInput): { success: boolean; task?: Task; error?: string } {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    runAndSave(
      `INSERT INTO tasks (id, project_id, title, description, status, priority, type, depends_on, estimated_time, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.project_id,
        input.title,
        input.description || null,
        input.priority || 'medium',
        input.type || null,
        input.depends_on ? JSON.stringify(input.depends_on) : null,
        input.estimated_time || null,
        now,
        now
      ]
    );

    const task = queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
    return { success: true, task };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function updateTask(input: UpdateTaskInput): { success: boolean; task?: Task; error?: string } {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.status) {
      fields.push('status = ?');
      values.push(input.status);
      if (input.status === 'completed') {
        fields.push('completed_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (input.priority) { fields.push('priority = ?'); values.push(input.priority); }
    if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description); }

    if (fields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(input.task_id);

    runAndSave(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);

    const task = queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [input.task_id]);
    return { success: true, task };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function getNextTasks(project_id: string, limit: number = 3): { success: boolean; tasks?: Task[]; error?: string } {
  try {
    const tasks = queryAll<Task>(
      `SELECT * FROM tasks
       WHERE project_id = ? AND status IN ('pending', 'in_progress')
       ORDER BY
         CASE priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at ASC
       LIMIT ?`,
      [project_id, limit]
    );

    return { success: true, tasks };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============== MEMORY TOOLS ==============

export function remember(input: RememberInput): { success: boolean; error?: string } {
  try {
    const id = uuidv4();
    const session_id = input.session_id || 'default';
    const now = new Date().toISOString();

    let expires_at: string | null = null;
    if (input.ttl_minutes) {
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + input.ttl_minutes);
      expires_at = expiry.toISOString();
    }

    // Check if key exists
    const existing = queryOne<{ id: string }>(
      'SELECT id FROM session_memory WHERE session_id = ? AND key = ?',
      [session_id, input.key]
    );

    if (existing) {
      // Update existing
      runAndSave(
        'UPDATE session_memory SET value = ?, created_at = ?, expires_at = ? WHERE session_id = ? AND key = ?',
        [input.value, now, expires_at, session_id, input.key]
      );
    } else {
      // Insert new
      runAndSave(
        'INSERT INTO session_memory (id, session_id, key, value, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, session_id, input.key, input.value, now, expires_at]
      );
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function recall(input: RecallInput): { success: boolean; value?: string; error?: string } {
  try {
    const session_id = input.session_id || 'default';

    const result = queryOne<{ value: string }>(
      `SELECT value FROM session_memory
       WHERE session_id = ? AND key = ?
       AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      [session_id, input.key]
    );

    if (!result) {
      return { success: false, error: 'Key not found or expired' };
    }

    return { success: true, value: result.value };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function forget(key: string, session_id?: string): { success: boolean; error?: string } {
  try {
    const sid = session_id || 'default';
    runAndSave('DELETE FROM session_memory WHERE session_id = ? AND key = ?', [sid, key]);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============== DECISION LOG TOOLS ==============

export function logDecision(input: LogDecisionInput): { success: boolean; decision_id?: string; error?: string } {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    runAndSave(
      `INSERT INTO decision_log (id, project_id, decision_type, input_context, decision, confidence, reasoning, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.project_id || null,
        input.decision_type,
        input.input_context || null,
        input.decision,
        input.confidence || null,
        input.reasoning || null,
        now
      ]
    );

    return { success: true, decision_id: id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export function getDecisionHistory(project_id?: string, limit: number = 10): { success: boolean; decisions?: any[]; error?: string } {
  try {
    let query = 'SELECT * FROM decision_log';
    const params: any[] = [];

    if (project_id) {
      query += ' WHERE project_id = ?';
      params.push(project_id);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const decisions = queryAll(query, params);
    return { success: true, decisions };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
