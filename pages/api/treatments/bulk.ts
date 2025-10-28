import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireDoctorOrAdmin, requireAuth } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireDoctorOrAdmin(req, res)
    if (!user) return

    if (req.method === 'POST') {
        // Bulk create treatments
        const { treatments, mode = 'create' } = req.body // mode can be 'create' or 'upsert'

        if (!Array.isArray(treatments) || treatments.length === 0) {
            return res.status(400).json({ error: 'Invalid treatments array' })
        }

        console.log(`[Bulk Create] Received ${treatments.length} treatments to import (mode: ${mode})`)

        try {
            // Collect all unique product names from all treatments
            const allProductNames = new Set<string>()
            treatments.forEach((t: any) => {
                if (t.products && Array.isArray(t.products)) {
                    t.products.forEach((p: any) => {
                        const productName = (p.productName || '').trim().toUpperCase()
                        if (productName) { // Only add non-empty names
                            allProductNames.add(productName)
                        }
                    })
                }
            })

            console.log(`[Bulk Create] Found ${allProductNames.size} unique product names`)

            // Get existing products from database (case-insensitive match)
            const existingProducts = await prisma.product.findMany({
                select: {
                    id: true,
                    name: true
                }
            })

            // Create a map of product names to IDs (case-insensitive)
            const productNameToId = new Map<string, number>()
            existingProducts.forEach((p: any) => {
                productNameToId.set(p.name.toUpperCase(), p.id)
            })

            console.log(`[Bulk Create] Found ${existingProducts.length} existing products in database`)

            // Find products that need to be created
            const productsToCreate: string[] = []
            allProductNames.forEach(name => {
                if (!productNameToId.has(name)) {
                    productsToCreate.push(name)
                }
            })

            // Create new products if needed
            if (productsToCreate.length > 0) {
                console.log(`[Bulk Create] Creating ${productsToCreate.length} new products...`)
                
                for (const productName of productsToCreate) {
                    const newProduct = await prisma.product.create({
                        data: {
                            name: productName,
                            priceCents: 0,
                            quantity: 0
                        }
                    })
                    productNameToId.set(productName.toUpperCase(), newProduct.id)
                    console.log(`[Bulk Create] Created product: ${productName} (ID: ${newProduct.id})`)
                }
            }

            console.log(`[Bulk Create] All products resolved. Starting treatment import...`)

            // Process in parallel batches for much faster performance
            const BATCH_SIZE = 10
            const results: any[] = []
            const errors: any[] = []
            
            // Split treatments into chunks
            const chunks = []
            for (let i = 0; i < treatments.length; i += BATCH_SIZE) {
                chunks.push(treatments.slice(i, i + BATCH_SIZE))
            }

            // Process each chunk in parallel
            for (const chunk of chunks) {
                const chunkPromises = chunk.map(async (treatmentData: any, index: number) => {
                    try {
                        const { 
                            provDiagnosis, planNumber, speciality, organ, diseaseAction, 
                            treatmentPlan, administration, notes, products 
                        } = treatmentData

                        // Map product names to IDs
                        const productsWithIds = (products || []).map((p: any) => {
                            const productName = (p.productName || '').trim().toUpperCase()
                            
                            // Skip if no product name provided
                            if (!productName) {
                                return null
                            }
                            
                            const productId = productNameToId.get(productName)
                            
                            if (!productId) {
                                throw new Error(`Product not found: ${p.productName}`)
                            }
                            
                            return {
                                productId: productId,
                                comp1: p.comp1 || null,
                                comp2: p.comp2 || null,
                                comp3: p.comp3 || null,
                                timing: p.timing || null,
                                dosage: p.dosage || null,
                                additions: p.additions || null,
                                procedure: p.procedure || null,
                                presentation: p.presentation || null,
                            }
                        }).filter((p: any) => p !== null) // Remove null entries

                        // Check if treatment exists (including deleted ones)
                        const existing = provDiagnosis && planNumber ? await prisma.treatment.findUnique({
                            where: {
                                provDiagnosis_planNumber: {
                                    provDiagnosis,
                                    planNumber
                                }
                            },
                            include: {
                                treatmentProducts: true
                            }
                        }) : null

                        if (existing) {
                            // Treatment exists - update it (restore if deleted)
                            // First delete old treatment products
                            await prisma.treatmentProduct.deleteMany({
                                where: { treatmentId: existing.id }
                            })

                            // Update treatment, restore if deleted, and create new products
                            return await prisma.treatment.update({
                                where: { id: existing.id },
                                data: {
                                    speciality,
                                    organ,
                                    diseaseAction,
                                    treatmentPlan,
                                    administration,
                                    notes,
                                    deleted: false, // Restore if deleted
                                    treatmentProducts: {
                                        create: productsWithIds
                                    }
                                }
                            })
                        }

                        // Create new treatment (no existing record found)
                        return await prisma.treatment.create({
                            data: {
                                provDiagnosis,
                                planNumber,
                                speciality,
                                organ,
                                diseaseAction,
                                treatmentPlan,
                                administration,
                                notes,
                                treatmentProducts: {
                                    create: productsWithIds
                                }
                            }
                        })
                    } catch (err: any) {
                        // Track individual errors but continue processing
                        const errorDetail = {
                            planNumber: treatmentData.planNumber,
                            provDiagnosis: treatmentData.provDiagnosis,
                            error: err.message,
                            code: err.code
                        }
                        errors.push(errorDetail)
                        console.log(`[Bulk Create] Error: Plan ${treatmentData.planNumber} (${treatmentData.provDiagnosis}): ${err.message}`)
                        return null
                    }
                })

                // Wait for current chunk to complete before moving to next
                const chunkResults = await Promise.all(chunkPromises)
                results.push(...chunkResults.filter(r => r !== null))
            }

            console.log(`[Bulk Create] Completed: ${results.length} successful, ${errors.length} errors`)

            return res.status(201).json({ 
                success: true, 
                count: results.length,
                errors: errors.length > 0 ? errors : undefined,
                message: errors.length > 0 
                    ? `Imported ${results.length} treatments with ${errors.length} errors` 
                    : `Successfully imported ${results.length} treatments`
            })
        } catch (err: any) {
            console.error('Bulk create error:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'DELETE') {
        // Bulk delete treatments
        const { ids } = req.body

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Invalid ids array' })
        }

        try {
            // Mark all as deleted in a single query - instant for any amount
            const updated = await prisma.treatment.updateMany({
                where: {
                    id: { in: ids }
                },
                data: {
                    deleted: true,
                    planNumber: null
                }
            })

            // Skip renumbering if too many records - can be done async or skipped
            // For better performance with large datasets, renumbering can be optional
            if (ids.length <= 100) {
                // Get all remaining non-deleted treatments to renumber them
                const remainingTreatments = await prisma.treatment.findMany({
                    where: {
                        deleted: { not: true },
                        planNumber: { not: null }
                    },
                    orderBy: {
                        planNumber: 'asc'
                    },
                    select: { id: true }
                })

                // Renumber plans in parallel batches
                const BATCH_SIZE = 20
                for (let i = 0; i < remainingTreatments.length; i += BATCH_SIZE) {
                    const batch = remainingTreatments.slice(i, i + BATCH_SIZE)
                    const updatePromises = batch.map((treatment: any, batchIndex: number) => {
                        const newPlanNumber = String(i + batchIndex + 1).padStart(2, '0')
                        return prisma.treatment.update({
                            where: { id: treatment.id },
                            data: { planNumber: newPlanNumber }
                        })
                    })
                    await Promise.all(updatePromises)
                }
            }

            return res.status(200).json({ 
                success: true, 
                deletedCount: updated.count 
            })
        } catch (err: any) {
            console.error('Bulk delete error:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
