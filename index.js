import cors from 'cors'
import crypto from 'node:crypto'
import express, { json } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'

// Read environment variables, otherwise use defaults
const PORT = process.env.PORT ?? 5003
const HOST = process.env.HOST ?? '0.0.0.0'
const BASE_URL = `http://${HOST}:${PORT}`

// Keep track of todo's. Doesn't persist across server restarts.
const TODOS = [
  { id: crypto.randomUUID(), title: 'Learn to create plugins for ChatGPT in JavaScript' }
]

const app = express()

app.use(cors({
  origin: [`${BASE_URL}`, 'https://chat.openai.com']
}))
app.use(json())

app.get((req, _res, next) => {
  console.info(`[${req.method}] ${req.url} ${JSON.stringify(req.body)}`)
  next()
})

app.get('/todos', (_req, res) => {
  return res.status(200).json({ todos: TODOS })
})

app.get('/todos/:id', (req, res) => {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: 'Missing id' })
  }

  const todo = TODOS.find((todo) => todo.id === id)
  if (!todo) {
    return res.status(404).json({ message: 'Todo not found' })
  }

  return res.status(200).json(todo)
})

app.post('/todos', (req, res) => {
  const { title } = req.body
  if (!title) {
    return res.status(400).json({ message: 'Missing title' })
  }

  const newTodo = { id: crypto.randomUUID(), title, completed: false }
  TODOS.push(newTodo)

  return res.status(201).json(newTodo)
})

app.put('/todos/:id', (req, res) => {
  const { id } = req.params
  const { title, completed } = req.body
  if (!id) {
    return res.status(400).json({ message: 'Missing id' })
  }
  if (!title) {
    return res.status(400).json({ message: 'Missing title' })
  }

  const todoIndex = TODOS.findIndex((todo) => todo.id === id)
  if (todoIndex === -1) {
    return res.status(404).json({ message: 'Todo not found' })
  }

  const newCompleted = typeof completed === 'boolean'
    ? completed
    : TODOS[todoIndex].completed

  TODOS[todoIndex] = { ...TODOS[todoIndex], title, completed: newCompleted }
  return res.status(200).json(TODOS[todoIndex])
})

app.delete('/todos/:id', (req, res) => {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: 'Missing id' })
  }

  const todoIndex = TODOS.findIndex((todo) => todo.id === id)
  if (todoIndex === -1) {
    return res.status(404).json({ message: 'Todo not found' })
  }

  TODOS.splice(todoIndex, 1)
  return res.status(204).send()
})

app.get('/logo.png', async (_req, res) => {
  const filePath = path.join(process.cwd(), 'logo.png')
  res.sendFile(filePath, { headers: { 'Content-Type': 'image/png' } })
})

app.get('/.well-known/ai-plugin.json', async (_req, res) => {
  const filePath = path.join(process.cwd(), '.well-known/ai-plugin.json')
  res.sendFile(filePath, { headers: { 'Content-Type': 'application/json' } })
})

app.get('/openapi.yaml', async (_req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'openapi.yaml')
    const yamlData = await fs.readFile(filePath, 'utf8')
    res.setHeader('Content-Type', 'text/yaml')
    res.send(yamlData)
  } catch (error) {
    console.error(`Unable to fetch openapi.yaml manifest: ${error.message}`)
    res.status(500).json({ message: 'Unable to fetch openapi.yaml manifest' })
  }
})

app.listen(PORT, HOST, () => {
  console.info(`ChatGPt plugin API listening on ${BASE_URL}`)
})
