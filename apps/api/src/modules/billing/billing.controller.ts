import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  RawBodyRequest,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BillingService } from './services/billing.service';
import { UsageService } from './services/usage.service';
import { InvoiceService } from './services/invoice.service';
import { AnalyticsService } from './services/analytics.service';
import { StripeService } from './services/stripe.service';
import { EntitlementService } from './services/entitlement.service';
import {
  SubscribeDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  AddPaymentMethodDto,
  QueryInvoicesDto,
  QueryUsageDto,
  QueryAdminSubscriptionsDto,
} from './dto/billing.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly usageService: UsageService,
    private readonly invoiceService: InvoiceService,
    private readonly analyticsService: AnalyticsService,
    private readonly stripeService: StripeService,
    private readonly entitlementService: EntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Public: Plans ───

  @Get('plans')
  @ApiOperation({ summary: 'List all available subscription plans' })
  async listPlans() {
    const plans = await this.billingService.listPlans();
    return { success: true, data: plans };
  }

  // ─── Authenticated: Subscription Management ───

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('subscription')
  @ApiOperation({ summary: 'Get current subscription' })
  async getCurrentSubscription(@Req() req: Request) {
    const userId = (req.user as any).id;
    const subscription = await this.billingService.getCurrentSubscription(userId);
    return { success: true, data: subscription };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  async subscribe(@Req() req: Request, @Body() dto: SubscribeDto) {
    const userId = (req.user as any).id;
    const subscription = await this.billingService.subscribe(userId, dto.planId, dto.billingCycle);
    return { success: true, data: subscription, message: 'Subscription created successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-plan')
  @ApiOperation({ summary: 'Upgrade or downgrade subscription plan' })
  async changePlan(@Req() req: Request, @Body() dto: ChangePlanDto) {
    const userId = (req.user as any).id;
    const subscription = await this.billingService.changePlan(
      userId,
      dto.planId,
      dto.billingCycle,
    );
    return { success: true, data: subscription, message: 'Plan changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@Req() req: Request, @Body() dto: CancelSubscriptionDto) {
    const userId = (req.user as any).id;
    const subscription = await this.billingService.cancelSubscription(userId, dto.reason);
    return { success: true, data: subscription, message: 'Subscription cancelled' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('reactivate')
  @ApiOperation({ summary: 'Reactivate a cancelled subscription' })
  async reactivateSubscription(@Req() req: Request) {
    const userId = (req.user as any).id;
    const subscription = await this.billingService.reactivateSubscription(userId);
    return { success: true, data: subscription, message: 'Subscription reactivated' };
  }

  // ─── Authenticated: Usage ───

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('usage')
  @ApiOperation({ summary: 'Get usage summary' })
  async getUsageSummary(@Req() req: Request) {
    const userId = (req.user as any).id;
    const usage = await this.usageService.getUsageSummary(userId);
    return { success: true, data: usage };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('usage/history')
  @ApiOperation({ summary: 'Get usage history records' })
  async getUsageHistory(@Req() req: Request, @Query() query: QueryUsageDto): Promise<any> {
    const userId = (req.user as any).id;
    const result = await this.usageService.getUsageHistory(userId, {
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
    return { success: true, data: result };
  }

  // ─── Authenticated: Entitlements ───

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('entitlements')
  @ApiOperation({ summary: 'Get current plan limits and entitlements' })
  async getEntitlements(@Req() req: Request) {
    const userId = (req.user as any).id;
    const limits = await this.entitlementService.getUserLimits(userId);
    const planName = await this.entitlementService.getUserPlanName(userId);
    return { success: true, data: { planName, ...limits } };
  }

  // ─── Authenticated: Invoices ───

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  async listInvoices(@Req() req: Request, @Query() query: QueryInvoicesDto) {
    const userId = (req.user as any).id;
    const result = await this.invoiceService.listInvoices(userId, {
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
    return { success: true, data: result };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details' })
  async getInvoice(@Req() req: Request, @Param('id') invoiceId: string) {
    const userId = (req.user as any).id;
    const invoice = await this.invoiceService.getInvoice(userId, invoiceId);
    return { success: true, data: invoice };
  }

  // ─── Authenticated: Payment Methods ───

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('payment-methods')
  @ApiOperation({ summary: 'List payment methods' })
  async listPaymentMethods(@Req() req: Request): Promise<any> {
    const userId = (req.user as any).id;
    const methods = await this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: methods };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('payment-methods')
  @ApiOperation({ summary: 'Add a payment method' })
  async addPaymentMethod(@Req() req: Request, @Body() dto: AddPaymentMethodDto): Promise<any> {
    const userId = (req.user as any).id;

    // If isDefault, unset other defaults
    if (dto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const method = await this.prisma.paymentMethod.create({
      data: {
        userId,
        type: (dto.type ?? 'CARD') as any,
        providerMethodId: dto.providerMethodId,
        last4: dto.last4,
        brand: dto.brand,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        isDefault: dto.isDefault ?? false,
      },
    });

    return { success: true, data: method, message: 'Payment method added' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('payment-methods/:id')
  @ApiOperation({ summary: 'Remove a payment method' })
  async removePaymentMethod(@Req() req: Request, @Param('id') methodId: string) {
    const userId = (req.user as any).id;

    await this.prisma.paymentMethod.deleteMany({
      where: { id: methodId, userId },
    });

    return { success: true, message: 'Payment method removed' };
  }

  // ─── Authenticated: Billing Activity ───

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('activity')
  @ApiOperation({ summary: 'Get billing activity log' })
  async getBillingActivity(@Req() req: Request, @Query() query: { page?: number; limit?: number }): Promise<any> {
    const userId = (req.user as any).id;
    const result = await this.billingService.getBillingActivity(
      userId,
      Number(query.page) || 1,
      Number(query.limit) || 20,
    );
    return { success: true, data: result };
  }

  // ─── Webhook: Stripe ───

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      const rawBody = req.rawBody;
      if (!rawBody) {
        return { success: false, error: 'No raw body' };
      }

      const event = this.stripeService.constructWebhookEvent(rawBody, signature);

      switch (event.type) {
        case 'invoice.payment_succeeded':
          // Handle successful payment
          break;
        case 'invoice.payment_failed':
          // Handle failed payment
          break;
        case 'customer.subscription.updated':
          // Handle subscription update
          break;
        case 'customer.subscription.deleted':
          // Handle subscription deletion
          break;
        default:
          break;
      }

      return { success: true, received: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─── Admin: Revenue Analytics ───

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get('admin/analytics')
  @ApiOperation({ summary: 'Get revenue analytics (Admin only)' })
  async getRevenueAnalytics() {
    const analytics = await this.analyticsService.getRevenueAnalytics();
    return { success: true, data: analytics };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get('admin/payments')
  @ApiOperation({ summary: 'Get recent payments (Admin only)' })
  async getRecentPayments(@Query('limit') limit?: number): Promise<any> {
    const payments = await this.analyticsService.getRecentPayments(Number(limit) || 20);
    return { success: true, data: payments };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get('admin/subscriptions')
  @ApiOperation({ summary: 'List all subscriptions (Admin only)' })
  async listAdminSubscriptions(@Query() query: QueryAdminSubscriptionsDto): Promise<any> {
    const result = await this.analyticsService.listSubscriptions({
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
    });
    return { success: true, data: result };
  }
}
