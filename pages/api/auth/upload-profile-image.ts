import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'
import formidable from 'formidable'
import cloudinary from 'cloudinary'
import fs from 'fs'

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

export const config = {
    api: {
        bodyParser: false
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const user = await requireAuth(req, res)
    if (!user) return

    try {
        const form = formidable({})
        const [fields, files] = await form.parse(req)

        console.log('Files received:', files)

        const imageFile = files.image?.[0]
        if (!imageFile) {
            console.error('No image file in request')
            return res.status(400).json({ error: 'No image file provided' })
        }

        console.log('Uploading to Cloudinary:', imageFile.filepath)

        // Upload to Cloudinary
        const result = await cloudinary.v2.uploader.upload(imageFile.filepath, {
            folder: 'llc-erp/profile-images',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' }
            ]
        })

        console.log('Cloudinary upload successful:', result.secure_url)

        // Delete old profile image from Cloudinary if exists
        if (user.profileImage) {
            try {
                const publicId = user.profileImage.split('/').slice(-2).join('/').split('.')[0]
                await cloudinary.v2.uploader.destroy(publicId)
            } catch (err) {
                console.error('Failed to delete old profile image:', err)
            }
        }

        console.log('Updating database for user:', user.id)

        // Update user profile image in database
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { profileImage: result.secure_url },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                profileImage: true
            }
        })

        console.log('Database updated successfully')

        // Clean up temporary file
        try {
            fs.unlinkSync(imageFile.filepath)
        } catch (err) {
            console.error('Failed to delete temp file:', err)
        }

        return res.status(200).json({
            imageUrl: result.secure_url,
            user: updatedUser
        })
    } catch (error) {
        console.error('Error uploading profile image:', error)
        // Return more detailed error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return res.status(500).json({
            error: 'Failed to upload profile image',
            details: errorMessage
        })
    }
}
