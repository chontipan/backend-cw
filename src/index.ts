import { Hono } from 'hono'

const app = new Hono()

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
    const r = await db.prepare('INSERT INTO items (title, description) VALUES (?, ?)').bind(title, description).run()
    const id = r?.lastInsertRowid || null
    if (!id) return c.json({ error: 'Insert failed' }, 500)
    const created = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).all()
    return c.json((created.results && created.results[0]) || null, 201)
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500)
  }
})

// Update item
app.put('/items/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const title = body.title
    const description = body.description ?? null
    if (!title) return c.json({ error: 'title is required' }, 400)
    const db = getDb(c)
    await db.prepare('UPDATE items SET title = ?, description = ? WHERE id = ?').bind(title, description, id).run()
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
