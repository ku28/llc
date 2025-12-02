import type { NextApiRequest, NextApiResponse } from 'next'
import cloudinary from 'cloudinary'

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb'
        },
        responseLimit: '50mb'
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { pdfData, filename, folder = 'llc-erp/prescriptions' } = req.body

        if (!pdfData || !filename) {
            console.error('Missing required fields:', { hasPdfData: !!pdfData, hasFilename: !!filename })
            return res.status(400).json({ error: 'Missing pdfData or filename' })
        }

        console.log('Uploading PDF to Cloudinary:', { filename, folder, dataLength: pdfData.length })

        // Extract base64 data from data URI
        // Format: data:application/pdf;filename=generated.pdf;base64,ACTUALBASE64DATA
        const base64Data = pdfData.includes('base64,') 
            ? pdfData.split('base64,')[1] 
            : pdfData

        console.log('Base64 data extracted, length:', base64Data.length)

        // Upload to Cloudinary with clean data URI
        const result = await cloudinary.v2.uploader.upload(`data:application/pdf;base64,${base64Data}`, {
            folder,
            public_id: filename,
            resource_type: 'raw',
            overwrite: true,
            invalidate: true, // Invalidate CDN cache
            tags: ['auto-delete', 'prescription'],
            context: {
                alt: 'Prescription PDF',
                expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours from now
            }
        })

        console.log('PDF uploaded successfully:', result.secure_url)

        return res.status(200).json({
            url: result.secure_url,
            publicId: result.public_id
        })
    } catch (error) {
        console.error('Error uploading PDF to Cloudinary:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return res.status(500).json({
            error: 'Failed to upload PDF',
            details: errorMessage
        })
    }
}
