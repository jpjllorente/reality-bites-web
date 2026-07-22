import { useMemo } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createShopCheckoutSession } from "@/lib/payments.functions";

export interface CheckoutCartItem {
  slug: string;
  qty: number;
  variantId?: string;
  portion?: boolean;
}

export interface CheckoutCustomer {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface Props {
  items: CheckoutCartItem[];
  customer: CheckoutCustomer;
  returnUrl: string;
}

export function StripeEmbeddedCheckout({ items, customer, returnUrl }: Props) {
  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
        const result = await createShopCheckoutSession({
          data: {
            environment: getStripeEnvironment(),
            returnUrl,
            customer: {
              name: customer.name,
              phone: customer.phone,
              email: customer.email || "",
              notes: customer.notes || "",
            },
            items,
          },
        });
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("Stripe no devolvió el client secret.");
        return result.clientSecret;
      },
    }),
    // Intentionally stable: the provider forbids swapping the client secret
    // after mount. Callers unmount this component when inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
