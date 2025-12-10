import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authUser = await getSessionUser(req)

    if (!authUser) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    if (authUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    const dataDir = path.join(process.cwd(), 'data')

    if (req.method === 'GET') {
        try {
            const file = req.query.file as string
            if (!file || !file.endsWith('.json')) {
                return res.status(400).json({ error: 'Invalid file name' })
            }

            const filePath = path.join(dataDir, file)
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' })
            }

            const content = fs.readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content)

            return res.status(200).json({ data })
        } catch (error) {
            console.error('Error reading dropdown data:', error)
            return res.status(500).json({ error: 'Failed to read dropdown data' })
        }
    }

    if (req.method === 'POST') {
        try {
            const { file, item } = req.body
            
            if (!file || !file.endsWith('.json')) {
                return res.status(400).json({ error: 'Invalid file name' })
            }

            if (!item || !item.value || !item.label) {
                return res.status(400).json({ error: 'Item must have value and label' })
            }

            const filePath = path.join(dataDir, file)
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' })
            }

            const content = fs.readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content)

            // Check if item already exists
            if (data.some((d: any) => d.value === item.value)) {
                return res.status(400).json({ error: 'Item with this value already exists' })
            }

            data.push(item)
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4))

            return res.status(200).json({ message: 'Item added successfully', data })
        } catch (error) {
            console.error('Error adding dropdown item:', error)
            return res.status(500).json({ error: 'Failed to add dropdown item' })
        }
    }

    if (req.method === 'PUT') {
        try {
            const { file, item, oldValue } = req.body
            
            if (!file || !file.endsWith('.json')) {
                return res.status(400).json({ error: 'Invalid file name' })
            }

            if (!item || !item.value || !item.label) {
                return res.status(400).json({ error: 'Item must have value and label' })
            }

            const filePath = path.join(dataDir, file)
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' })
            }

            const content = fs.readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content)

            const index = data.findIndex((d: any) => d.value === oldValue)
            if (index === -1) {
                return res.status(404).json({ error: 'Item not found' })
            }

            data[index] = item
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4))

            return res.status(200).json({ message: 'Item updated successfully', data })
        } catch (error) {
            console.error('Error updating dropdown item:', error)
            return res.status(500).json({ error: 'Failed to update dropdown item' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { file, value } = req.body
            
            if (!file || !file.endsWith('.json')) {
                return res.status(400).json({ error: 'Invalid file name' })
            }

            const filePath = path.join(dataDir, file)
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' })
            }

            const content = fs.readFileSync(filePath, 'utf-8')
            const data = JSON.parse(content)

            const filteredData = data.filter((d: any) => d.value !== value)
            
            if (filteredData.length === data.length) {
                return res.status(404).json({ error: 'Item not found' })
            }

            fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 4))

            return res.status(200).json({ message: 'Item deleted successfully', data: filteredData })
        } catch (error) {
            console.error('Error deleting dropdown item:', error)
            return res.status(500).json({ error: 'Failed to delete dropdown item' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
