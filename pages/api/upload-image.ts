import type { NextApiRequest, NextApiResponse } from 'next'
import { v2 as cloudinary } from 'cloudinary'
import { requireAuth } from '../../lib/auth'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, folder = 'patients' } = req.body

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: `llc-erp/${folder}`,
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })

    return res.status(200).json({
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id
    })
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error)
    return res.status(500).json({ error: error.message || 'Failed to upload image' })
  }
}
