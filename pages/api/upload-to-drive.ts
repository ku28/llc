import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { file, fileName, patientName, mimeType } = req.body

        if (!file || !fileName || !patientName) {
            return res.status(400).json({ error: 'Missing required fields: file, fileName, or patientName' })
        }

        // Setup Google Drive API
        // Note: You'll need to set up Google OAuth2 credentials and add them to .env
        // GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
        )

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        })

        const drive = google.drive({ version: 'v3', auth: oauth2Client })

        // Find or create patient folder
        const folderName = patientName
        let folderId: string | null = null

        // Search for existing folder
        const folderSearchResponse = await drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        })

        if (folderSearchResponse.data.files && folderSearchResponse.data.files.length > 0) {
            folderId = folderSearchResponse.data.files[0].id || null
        } else {
            // Create new folder
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            }
            const folderResponse = await drive.files.create({
                requestBody: folderMetadata,
                fields: 'id'
            })
            folderId = folderResponse.data.id || null
        }

        if (!folderId) {
            throw new Error('Failed to create or find patient folder')
        }

        // Convert base64 to buffer
        const base64Data = file.split(',')[1] || file
        const buffer = Buffer.from(base64Data, 'base64')

        // Upload file to Google Drive
        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        }

        const media = {
            mimeType: mimeType || 'application/octet-stream',
            body: require('stream').Readable.from(buffer)
        }

        const fileResponse = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink, thumbnailLink'
        })

        // Make file publicly accessible (optional - you can skip this for private files)
        if (fileResponse.data.id) {
            await drive.permissions.create({
                fileId: fileResponse.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            })
        }

        return res.status(200).json({
            fileId: fileResponse.data.id,
            fileName: fileResponse.data.name,
            viewLink: fileResponse.data.webViewLink,
            downloadLink: fileResponse.data.webContentLink,
            thumbnailLink: fileResponse.data.thumbnailLink,
            folderId: folderId
        })
    } catch (error: any) {
        console.error('Google Drive upload error:', error)
        return res.status(500).json({ error: error.message || 'Failed to upload to Google Drive' })
    }
}
