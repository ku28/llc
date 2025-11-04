import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireStaffOrAbove } from '../../../lib/auth'
import { sendEmail } from '../../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireStaffOrAbove(req, res)
    if (!user) return
    
    if (req.method === 'POST') {
        try {
            const { purchaseOrderId } = req.body
            console.log('Send email request received for PO ID:', purchaseOrderId)

            if (!purchaseOrderId) {
                console.error('Missing purchase order ID')
                return res.status(400).json({ error: 'Purchase order ID is required' })
            }

            // Fetch the purchase order with all details
            const purchaseOrder = await prisma.purchaseOrder.findUnique({
                where: { id: Number(purchaseOrderId) },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })

            console.log('Found purchase order:', purchaseOrder?.poNumber)

            if (!purchaseOrder) {
                console.error('Purchase order not found:', purchaseOrderId)
                return res.status(404).json({ error: 'Purchase order not found' })
            }

            if (!purchaseOrder.supplier.email) {
                console.error('Supplier has no email:', purchaseOrder.supplier.name)
                return res.status(400).json({ error: 'Supplier does not have an email address' })
            }

            console.log('Sending email to supplier:', purchaseOrder.supplier.name, purchaseOrder.supplier.email)

            // Create email content
            const itemsTable = purchaseOrder.items.map((item: any, index: number) => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item.product.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.product.unit || 'pcs'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.totalAmount.toFixed(2)}</td>
                </tr>
            `).join('')

            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
                        th { background: #667eea; color: white; padding: 12px; text-align: left; }
                        .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
                        .total { font-size: 1.2em; font-weight: bold; color: #667eea; text-align: right; margin-top: 20px; padding: 15px; background: white; border-radius: 4px; }
                        .footer { margin-top: 30px; padding: 20px; background: white; border-radius: 4px; text-align: center; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Purchase Order</h1>
                            <p style="margin: 0; font-size: 1.2em;">${purchaseOrder.poNumber}</p>
                        </div>
                        <div class="content">
                            <div style="background: white; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                                <h2 style="color: #667eea; margin-top: 0;">Order Details</h2>
                                <div class="info-row">
                                    <span><strong>Order Date:</strong></span>
                                    <span>${new Date(purchaseOrder.orderDate).toLocaleDateString('en-GB')}</span>
                                </div>
                                ${purchaseOrder.expectedDate ? `
                                <div class="info-row">
                                    <span><strong>Expected Delivery:</strong></span>
                                    <span>${new Date(purchaseOrder.expectedDate).toLocaleDateString('en-GB')}</span>
                                </div>
                                ` : ''}
                                <div class="info-row">
                                    <span><strong>Supplier:</strong></span>
                                    <span>${purchaseOrder.supplier.name}</span>
                                </div>
                                <div class="info-row">
                                    <span><strong>Status:</strong></span>
                                    <span style="color: #f59e0b; font-weight: bold;">${purchaseOrder.status.toUpperCase()}</span>
                                </div>
                            </div>

                            <h2 style="color: #667eea;">Order Items</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 5%;">S.No</th>
                                        <th style="width: 35%;">Product Name</th>
                                        <th style="width: 15%; text-align: center;">Quantity</th>
                                        <th style="width: 10%; text-align: center;">Unit</th>
                                        <th style="width: 15%; text-align: right;">Unit Price</th>
                                        <th style="width: 20%; text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsTable}
                                </tbody>
                            </table>

                            <div class="total">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Subtotal:</span>
                                    <span>₹${purchaseOrder.subtotal.toFixed(2)}</span>
                                </div>
                                ${purchaseOrder.taxAmount > 0 ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Tax:</span>
                                    <span>₹${purchaseOrder.taxAmount.toFixed(2)}</span>
                                </div>
                                ` : ''}
                                ${purchaseOrder.discount > 0 ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Discount:</span>
                                    <span>-₹${purchaseOrder.discount.toFixed(2)}</span>
                                </div>
                                ` : ''}
                                ${purchaseOrder.shippingCost > 0 ? `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Shipping:</span>
                                    <span>₹${purchaseOrder.shippingCost.toFixed(2)}</span>
                                </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; border-top: 2px solid #667eea; padding-top: 10px; margin-top: 10px;">
                                    <span>Total Amount:</span>
                                    <span>₹${purchaseOrder.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            ${purchaseOrder.notes ? `
                            <div style="background: #fef3c7; padding: 15px; border-radius: 4px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                                <strong>Note:</strong> ${purchaseOrder.notes}
                            </div>
                            ` : ''}

                            <div class="footer">
                                <p style="margin: 0;"><strong>Please confirm receipt of this purchase order.</strong></p>
                                <p style="margin: 5px 0 0 0; font-size: 0.9em;">
                                    For any queries, please contact us.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `

            // Send email
            await sendEmail({
                to: purchaseOrder.supplier.email,
                subject: `Purchase Order ${purchaseOrder.poNumber} - Order Confirmation`,
                html: emailHtml
            })

            console.log('Email sent successfully to:', purchaseOrder.supplier.email)

            return res.status(200).json({ 
                success: true, 
                message: `Purchase order sent to ${purchaseOrder.supplier.name} (${purchaseOrder.supplier.email})`
            })
        } catch (error) {
            console.error('Error sending purchase order email:', error)
            return res.status(500).json({ error: 'Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error') })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
