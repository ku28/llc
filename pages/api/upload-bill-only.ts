import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
    api: {
        bodyParser: false,
    },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB
            keepExtensions: true,
        })

        const [fields, files] = await form.parse(req)
        const file = Array.isArray(files.file) ? files.file[0] : files.file

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        // Save the file to public/bills directory
        const uploadsDir = path.join(process.cwd(), 'public', 'bills')
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true })
        }

        const timestamp = Date.now()
        const fileName = `bill_${timestamp}${path.extname(file.originalFilename || '')}`
        const filePath = path.join(uploadsDir, fileName)
        
        // Copy file to permanent location
        fs.copyFileSync(file.filepath, filePath)
        
        // Generate public URL
        const billUrl = `/bills/${fileName}`

        // Clean up the temporary file
        if (file.filepath && fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath)
        }

        res.status(200).json({
            success: true,
            billUrl: billUrl,
            message: 'Bill uploaded successfully'
        })

    } catch (error: any) {
        console.error('Bill upload error:', error)
        res.status(500).json({ 
            error: 'Failed to upload bill',
            details: error.message 
        })
    }
}
