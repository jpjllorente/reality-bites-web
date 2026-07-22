import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as customOrderConfirmation } from './custom-order-confirmation'
import { template as customOrderNotification } from './custom-order-notification'
import { template as customOrderQuote } from './custom-order-quote'
import { template as customOrderPaid } from './custom-order-paid'
import { template as shopOrderConfirmation } from './shop-order-confirmation'
import { template as shopOrderNotification } from './shop-order-notification'
import { template as shopOrderOrphanPayment } from './shop-order-orphan-payment'
import { template as shopOrderRefund } from './shop-order-refund'
import { template as shopOrderInStore } from './shop-order-in-store'
import { template as shopOrderInStorePaid } from './shop-order-in-store-paid'
import { template as shopOrderFailed } from './shop-order-failed'
import { template as shopOrderCancelled } from './shop-order-cancelled'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'custom-order-confirmation': customOrderConfirmation,
  'custom-order-notification': customOrderNotification,
  'custom-order-quote': customOrderQuote,
  'custom-order-paid': customOrderPaid,
  'shop-order-confirmation': shopOrderConfirmation,
  'shop-order-notification': shopOrderNotification,
  'shop-order-orphan-payment': shopOrderOrphanPayment,
  'shop-order-refund': shopOrderRefund,
  'shop-order-in-store': shopOrderInStore,
  'shop-order-in-store-paid': shopOrderInStorePaid,
  'shop-order-failed': shopOrderFailed,
  'shop-order-cancelled': shopOrderCancelled,
}
