import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Enable CORS for browser-based frontend (adjust origin as needed)
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// Health
app.get('/', (c) => c.text('Hello Hono!'))

// Helper to get D1 binding (wrangler config binds database to `my_db`)
const getDb = (c: any) => c.env?.my_db

// List items
app.get('/items', async (c) => {
  try {
    const db = getDb(c)
    const r = await db.prepare('SELECT * FROM items ORDER BY id DESC').all()
    return c.json(r.results || [])
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500)
  }
})

// Get single item
app.get('/items/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const db = getDb(c)
    const r = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).all()
    const item = (r.results && r.results[0]) || null
    if (!item) return c.json({ error: 'Not found' }, 404)
    return c.json(item)
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500)
  }
})

// Create item
app.post('/items', async (c) => {
  try {
    const body = await c.req.json()
    const title = body.title
    const description = body.description ?? null
    if (!title) return c.json({ error: 'title is required' }, 400)
    const db = getDb(c)
    await db.prepare('INSERT INTO items (title, description) VALUES (?, ?)').bind(title, description).run()
    // Use SQLite last_insert_rowid() to get the row inserted by this connection
    const created = await db.prepare('SELECT * FROM items WHERE id = last_insert_rowid()').all()
    const item = (created.results && created.results[0]) || null
    if (!item) return c.json({ error: 'Insert failed' }, 500)
    return c.json(item, 201)
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500)
  }
})

// Update item
app.put('/items/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const db = getDb(c)
    // Build dynamic SET clause to allow partial updates
    const fields: string[] = []
    const params: any[] = []
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      fields.push('title = ?')
      params.push(body.title)
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      fields.push('description = ?')
      params.push(body.description)
    }
    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)
    params.push(id)
    const sql = `UPDATE items SET ${fields.join(', ')} WHERE id = ?`
    await db.prepare(sql).bind(...params).run()
    const updated = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).all()
    const item = (updated.results && updated.results[0]) || null
    if (!item) return c.json({ error: 'Not found' }, 404)
    return c.json(item)
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500)
  }
})

// Delete item
app.delete('/items/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const db = getDb(c)
    const r = await db.prepare('DELETE FROM items WHERE id = ?').bind(id).run()
    // r.changes may be available; respond 204 if deleted
    return c.text('', r?.changes ? 204 : 204)
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500)
  }
})

export default app
