const request = require('supertest');
const express = require('express');

// Mock db module
jest.mock('../src/db', () => ({
  query: jest.fn(),
  checkConnection: jest.fn(),
  initializeDatabase: jest.fn(),
}));

const db = require('../src/db');
const tasksRoutes = require('../src/routes/tasks');

const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRoutes);

describe('Tasks API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks/stats/summary', () => {
    it('returns aggregated summary statistics', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // total
        .mockResolvedValueOnce({ rows: [{ count: '6' }] })  // completed
        .mockResolvedValueOnce({ rows: [{ count: '4' }] })  // pending
        .mockResolvedValueOnce({
          rows: [
            { category: 'Docker', count: '3' },
            { category: 'CI/CD', count: '4' },
          ],
        }); // categories

      const res = await request(app).get('/api/tasks/stats/summary');
      expect(res.statusCode).toEqual(200);
      expect(res.body.total).toBe(10);
      expect(res.body.completed).toBe(6);
      expect(res.body.pending).toBe(4);
      expect(res.body.completionRate).toBe(60);
      expect(res.body.categories).toHaveLength(2);
    });

    it('handles 0 tasks gracefully with 0% completion rate', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/tasks/stats/summary');
      expect(res.statusCode).toEqual(200);
      expect(res.body.total).toBe(0);
      expect(res.body.completionRate).toBe(0);
    });
  });

  describe('GET /api/tasks', () => {
    it('retrieves all tasks successfully', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', category: 'DevOps', status: 'Pending', priority: 'High' },
        { id: 2, title: 'Task 2', category: 'Docker', status: 'Completed', priority: 'Medium' },
      ];
      db.query.mockResolvedValueOnce({ rows: mockTasks, rowCount: 2 });

      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toEqual(200);
      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    it('filters tasks by category and status', async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app).get('/api/tasks?category=CI/CD&status=Pending');
      expect(res.statusCode).toEqual(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1 AND status = $2'),
        ['CI/CD', 'Pending']
      );
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('returns task when found', async () => {
      const task = { id: 1, title: 'Sample Task', category: 'DevOps' };
      db.query.mockResolvedValueOnce({ rows: [task] });

      const res = await request(app).get('/api/tasks/1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.task.title).toBe('Sample Task');
    });

    it('returns 404 when task is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/tasks/999');
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Task not found');
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a task with valid payload', async () => {
      const newTask = {
        id: 3,
        title: 'New Terraform Module',
        description: 'VPC and ALB module',
        category: 'Infrastructure',
        status: 'Pending',
        priority: 'High',
      };
      db.query.mockResolvedValueOnce({ rows: [newTask] });

      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'New Terraform Module',
          description: 'VPC and ALB module',
          category: 'Infrastructure',
          priority: 'High',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.task.id).toBe(3);
      expect(res.body.message).toBe('Task created successfully');
    });

    it('returns 400 when title is missing or empty', async () => {
      const res = await request(app).post('/api/tasks').send({ title: '   ' });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Task title is required');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('updates an existing task', async () => {
      const updated = {
        id: 1,
        title: 'Updated Title',
        description: 'Updated Desc',
        category: 'DevOps',
        status: 'Completed',
        priority: 'Low',
      };
      db.query.mockResolvedValueOnce({ rows: [updated] });

      const res = await request(app)
        .put('/api/tasks/1')
        .send({
          title: 'Updated Title',
          description: 'Updated Desc',
          category: 'DevOps',
          status: 'Completed',
          priority: 'Low',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.task.title).toBe('Updated Title');
    });

    it('returns 404 when updating non-existent task', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/tasks/999')
        .send({ title: 'Update' });

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PATCH /api/tasks/:id/toggle', () => {
    it('toggles task from Pending to Completed', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ status: 'Pending' }] }) // current
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'Completed' }] }); // updated

      const res = await request(app).patch('/api/tasks/1/toggle');
      expect(res.statusCode).toEqual(200);
      expect(res.body.task.status).toBe('Completed');
      expect(res.body.message).toBe('Status updated to Completed');
    });

    it('returns 404 when toggling non-existent task', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).patch('/api/tasks/999/toggle');
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes an existing task', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app).delete('/api/tasks/1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Task deleted successfully');
      expect(res.body.deletedId).toBe('1');
    });

    it('returns 404 when deleting non-existent task', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/tasks/999');
      expect(res.statusCode).toEqual(404);
    });
  });
});

