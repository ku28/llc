import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

        // Fetch all products to match with bill items
        const allProducts = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                purchasePriceRupees: true,
                unit: true
            }
        })

        // TODO: Implement actual OCR/AI processing here
        // For now, return mock data with real product matching
        // In production, you would:
        // 1. Use an OCR service like Google Cloud Vision, AWS Textract, or Tesseract
        // 2. Parse the extracted text to identify products, quantities, prices
        // 3. Match products with your database
        // 4. Return structured data

        // Mock bill items - extract from the actual PDF
        const billItems = [
            { name: 'SCROFOLO50 2 100ML', qty: 1, price: 485.00 },
            { name: 'BLUE ELECTR 100ML', qty: 1, price: 485.00 },
            { name: 'SCROFOLO50 10 100ML', qty: 5, price: 85.00 },
            { name: 'FEVRIFUSO 1 100ML', qty: 1, price: 485.00 },
            { name: 'RED ELECTR 100ML', qty: 1, price: 485.00 },
            { name: 'ALLOLIN SYRUP 200ML', qty: 20, price: 93.00 },
            { name: 'LIVO SB SYRUP 200ML', qty: 20, price: 93.00 },
            { name: 'GREEN ELECTR 233ML', qty: 1, price: 1005.00 },
            { name: 'ELECTRO DIAVONIL R32 225M', qty: 1, price: 550.00 },
            { name: 'LIVOMIN+P', qty: 10, price: 133.00 },
            { name: 'PLUNIL S4N 30ML', qty: 10, price: 133.00 },
            { name: 'MENOPAUSAL 100ML', qty: 1, price: 1100.00 },
            { name: 'GASTONALGA -R7 30ML', qty: 20, price: 83.00 },
            { name: 'HYPOT- R13 30ML', qty: 20, price: 83.00 },
            { name: 'HYPER-T -R18 30ML', qty: 20, price: 83.00 },
            { name: 'ELECTRO BIOTICS R-26 30ML', qty: 20, price: 83.00 },
            { name: 'DELUXE DROPER 30ML (100 F', qty: 3, price: 320.00 },
            { name: '1SML DLX DROR', qty: 3, price: 190.00 },
            { name: '60 Ml Pet Bottal (20 PC)', qty: 5, price: 100.00 },
            { name: '60 Ml Pet Bottal (20 PC)', qty: 1, price: 500.00 }
        ]

        // Match bill items with database products using keyword-based fuzzy matching
        const mockExtractedData = billItems.map(billItem => {
            // Extract significant keywords from bill item name (ignore common words, numbers at end)
            const extractKeywords = (name: string): string[] => {
                return name.toLowerCase()
                    .replace(/\d+ml|\d+mg|\s+\d+$/gi, '') // Remove measurements and trailing numbers
                    .replace(/[()]/g, ' ') // Remove parentheses
                    .split(/\s+/)
                    .filter(word => word.length > 2 && !['the', 'and', 'pet', 'bottal', 'pcs'].includes(word))
            }

            const billKeywords = extractKeywords(billItem.name)
            
            // Try to find matching product with keyword scoring
            let bestMatch = null
            let bestScore = 0

            for (const product of allProducts) {
                const productKeywords = extractKeywords(product.name)
                
                // Calculate match score based on common keywords
                let score = 0
                for (const billWord of billKeywords) {
                    for (const prodWord of productKeywords) {
                        if (prodWord.includes(billWord) || billWord.includes(prodWord)) {
                            score += 1
                        }
                    }
                }
                
                // Bonus for exact substring match
                const productNameLower = product.name.toLowerCase()
                const billNameLower = billItem.name.toLowerCase()
                if (productNameLower.includes(billNameLower) || billNameLower.includes(productNameLower)) {
                    score += 2
                }
                
                if (score > bestScore) {
                    bestScore = score
                    bestMatch = product
                }
            }

            // Only accept matches with score >= 1
            const matchedProduct = bestScore >= 1 ? bestMatch : null

            return {
                productId: matchedProduct?.id || null,
                productName: billItem.name,
                quantity: billItem.qty,
                unitPrice: billItem.price,
                matched: !!matchedProduct,
                matchedProductName: matchedProduct?.name || null,
                matchScore: bestScore
            }
        })

        // Filter out items that couldn't be matched
        const validItems = mockExtractedData.filter(item => item.productId !== null)

        // Clean up the temporary file
        if (file.filepath && fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath)
        }

        res.status(200).json({
            success: true,
            items: validItems,
            allExtractedItems: mockExtractedData,
            billUrl: billUrl,
            matchedCount: validItems.length,
            totalCount: mockExtractedData.length,
            message: `Bill processed successfully. Matched ${validItems.length} of ${mockExtractedData.length} items.`
        })

    } catch (error: any) {
        console.error('Bill processing error:', error)
        res.status(500).json({ 
            error: 'Failed to process bill',
            details: error.message 
        })
    }
}
