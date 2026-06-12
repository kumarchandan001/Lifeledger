import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceResponse } from '@lifeledger/shared';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private invoiceCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an invoice for a subscription period.
   */
  async generateInvoice(
    userId: string,
    subscriptionId: string,
    amount: number,
    description?: string,
  ): Promise<InvoiceResponse> {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) throw new NotFoundException('Subscription not found');

    const tax = parseFloat((amount * 0.18).toFixed(2)); // 18% GST
    const totalAmount = parseFloat((amount + tax).toFixed(2));

    // Generate invoice number
    this.invoiceCounter++;
    const now = new Date();
    const invoiceNumber = `LL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(this.invoiceCounter).padStart(6, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        userId,
        subscriptionId,
        invoiceNumber,
        amount,
        tax,
        totalAmount,
        currency: sub.plan.currency,
        status: 'ISSUED',
        description: description ?? `${sub.plan.displayName} - ${sub.billingCycle.toLowerCase()} subscription`,
        billingPeriodStart: sub.currentPeriodStart,
        billingPeriodEnd: sub.currentPeriodEnd,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Log billing event
    await this.prisma.billingEvent.create({
      data: {
        subscriptionId,
        type: 'INVOICE_GENERATED',
        payload: {
          invoiceId: invoice.id,
          invoiceNumber,
          amount,
          tax,
          totalAmount,
        } as any,
      },
    });

    this.logger.log(`Invoice ${invoiceNumber} generated for user ${userId}`);
    return this.formatInvoice(invoice);
  }

  /**
   * Mark an invoice as paid.
   */
  async markInvoicePaid(invoiceId: string): Promise<InvoiceResponse> {
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    return this.formatInvoice(invoice);
  }

  /**
   * Void an invoice.
   */
  async voidInvoice(invoiceId: string): Promise<InvoiceResponse> {
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'VOID' },
    });

    return this.formatInvoice(invoice);
  }

  /**
   * List invoices for a user.
   */
  async listInvoices(
    userId: string,
    options: { status?: string; page?: number; limit?: number } = {},
  ) {
    const { status, page = 1, limit = 20 } = options;

    const where: any = { userId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      invoices: invoices.map(this.formatInvoice),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single invoice.
   */
  async getInvoice(userId: string, invoiceId: string): Promise<InvoiceResponse> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.formatInvoice(invoice);
  }

  // ─── Helpers ───

  private formatInvoice(invoice: any): InvoiceResponse {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      tax: Number(invoice.tax),
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description,
      billingPeriodStart: invoice.billingPeriodStart?.toISOString() ?? null,
      billingPeriodEnd: invoice.billingPeriodEnd?.toISOString() ?? null,
      pdfUrl: invoice.pdfUrl,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
    };
  }
}
