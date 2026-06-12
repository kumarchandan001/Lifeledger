import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Abstracted payment provider service.
 * Uses Stripe in production, mock in development/test.
 */

export interface CreateCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  customerId: string;
  clientSecret?: string;
  status: string;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, any>;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly useMock: boolean;
  private stripe: any;

  constructor(private readonly config: ConfigService) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.useMock = !stripeKey || stripeKey === 'mock' || stripeKey === '';

    if (!this.useMock) {
      try {
        // Dynamic import so the module doesn't fail if stripe isn't installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Stripe = require('stripe');
        this.stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
        this.logger.log('Stripe initialized in LIVE mode');
      } catch {
        this.useMock = true;
        this.logger.warn('Stripe SDK not installed, falling back to MOCK mode');
      }
    }

    if (this.useMock) {
      this.logger.log('Stripe running in MOCK mode');
    }
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  // ─── Customer Management ───

  async createCustomer(email: string, name: string, metadata: Record<string, string> = {}): Promise<string> {
    if (this.useMock) {
      const id = `cus_mock_${Date.now()}`;
      this.logger.debug(`Mock customer created: ${id}`);
      return id;
    }

    const customer = await this.stripe.customers.create({ email, name, metadata });
    return customer.id;
  }

  async getCustomer(customerId: string): Promise<any> {
    if (this.useMock) {
      return { id: customerId, email: 'mock@example.com', name: 'Mock User' };
    }
    return this.stripe.customers.retrieve(customerId);
  }

  // ─── Subscription Management ───

  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays: number = 0,
  ): Promise<CreateSubscriptionResult> {
    if (this.useMock) {
      const id = `sub_mock_${Date.now()}`;
      this.logger.debug(`Mock subscription created: ${id}`);
      return {
        subscriptionId: id,
        customerId,
        status: trialDays > 0 ? 'trialing' : 'active',
      };
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays > 0 ? trialDays : undefined,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return {
      subscriptionId: subscription.id,
      customerId,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      status: subscription.status,
    };
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<void> {
    if (this.useMock) {
      this.logger.debug(`Mock subscription cancelled: ${subscriptionId}`);
      return;
    }

    if (atPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<void> {
    if (this.useMock) {
      this.logger.debug(`Mock subscription updated: ${subscriptionId} -> ${newPriceId}`);
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    if (this.useMock) {
      this.logger.debug(`Mock subscription reactivated: ${subscriptionId}`);
      return;
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // ─── Payment Methods ───

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<any> {
    if (this.useMock) {
      return {
        id: paymentMethodId,
        card: { last4: '4242', brand: 'visa', exp_month: 12, exp_year: 2028 },
      };
    }

    const pm = await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    return pm;
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    if (this.useMock) {
      this.logger.debug(`Mock payment method detached: ${paymentMethodId}`);
      return;
    }
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // ─── Webhooks ───

  constructWebhookEvent(rawBody: Buffer, signature: string): WebhookEvent {
    if (this.useMock) {
      // In mock mode, parse the raw body as JSON directly
      const body = JSON.parse(rawBody.toString());
      return { type: body.type, data: body.data ?? {} };
    }

    const endpointSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    return { type: event.type, data: event.data.object };
  }

  // ─── Invoices ───

  async getInvoice(invoiceId: string): Promise<any> {
    if (this.useMock) {
      return {
        id: invoiceId,
        amount_paid: 49900,
        currency: 'inr',
        status: 'paid',
        invoice_pdf: null,
      };
    }
    return this.stripe.invoices.retrieve(invoiceId);
  }

  // ─── Refunds ───

  async createRefund(paymentIntentId: string, amount?: number): Promise<any> {
    if (this.useMock) {
      return { id: `re_mock_${Date.now()}`, status: 'succeeded', amount: amount ?? 0 };
    }
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
    });
  }
}
