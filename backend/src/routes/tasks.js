const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../logger');

// GET /api/tasks/stats/summary - Summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalQuery = await db.query('SELECT COUNT(*) FROM tasks');
    const completedQuery = await db.query("SELECT COUNT(*) FROM tasks WHERE status = 'Completed'");
    const pendingQuery = await db.query("SELECT COUNT(*) FROM tasks WHERE status = 'Pending'");
    const categoriesQuery = await db.query('SELECT category, COUNT(*) as count FROM tasks GROUP BY category');

    const total = parseInt(totalQuery.rows[0].count, 10);
    const completed = parseInt(completedQuery.rows[0].count, 10);
    const pending = parseInt(pendingQuery.rows[0].count, 10);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      total,
      completed,
      pending,
      completionRate,
      categories: categoriesQuery.rows,
    });
  } catch (error) {
    logger.error('Error fetching task statistics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve task statistics' });
  }
});

// GET /api/tasks - Retrieve all tasks
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    let queryText = 'SELECT * FROM tasks';
    const queryParams = [];

    const conditions = [];
    if (category) {
      queryParams.push(category);
      conditions.push(`category = $${queryParams.length}`);
    }
    if (status) {
      queryParams.push(status);
      conditions.push(`status = $${queryParams.length}`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await db.query(queryText, queryParams);
    res.json({ tasks: result.rows, count: result.rowCount });
  } catch (error) {
    logger.error('Error fetching tasks', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve tasks from database' });
  }
});

// GET /api/tasks/:id - Retrieve single task
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching task', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to retrieve task' });
  }
});

// POST /api/tasks - Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, category = 'DevOps', status = 'Pending', priority = 'Medium' } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const result = await db.query(
      `INSERT INTO tasks (title, description, category, status, priority, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [title.trim(), description || '', category, status, priority]
    );

    logger.info('Created new task', { taskId: result.rows[0].id, title });
    res.status(201).json({ task: result.rows[0], message: 'Task created successfully' });
  } catch (error) {
    logger.error('Error creating task', { error: error.message });
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update task details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, status, priority } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const result = await db.query(
      `UPDATE tasks 
       SET title = $1, description = $2, category = $3, status = $4, priority = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title.trim(), description || '', category || 'DevOps', status || 'Pending', priority || 'Medium', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    logger.info('Updated task', { taskId: id });
    res.json({ task: result.rows[0], message: 'Task updated successfully' });
  } catch (error) {
    logger.error('Error updating task', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PATCH /api/tasks/:id/toggle - Toggle status between Pending & Completed
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT status FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newStatus = existing.rows[0].status === 'Completed' ? 'Pending' : 'Completed';

    const result = await db.query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    logger.info('Toggled task status', { taskId: id, newStatus });
    res.json({ task: result.rows[0], message: `Status updated to ${newStatus}` });
  } catch (error) {
    logger.error('Error toggling task status', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to toggle task status' });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    logger.info('Deleted task', { taskId: id });
    res.json({ message: 'Task deleted successfully', deletedId: id });
  } catch (error) {
    logger.error('Error deleting task', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
