import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

let stripePromise = null;

export const StripeProvider = ({ stripeKey, children }) => {
  if (!stripePromise && stripeKey) {
    stripePromise = loadStripe(stripeKey);
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};
