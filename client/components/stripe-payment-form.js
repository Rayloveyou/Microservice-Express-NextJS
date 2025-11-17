import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  }
};

export const StripePaymentForm = ({ amount, email, onToken, disabled }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      const { error, token } = await stripe.createToken(cardElement, {
        name: email
      });

      if (error) {
        setError(error.message);
        setProcessing(false);
      } else {
        // Call parent callback with token
        await onToken(token);
        setProcessing(false);
      }
    } catch (err) {
      setError(err.message || 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Card Details</label>
        <div className="p-3 border rounded">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        {error && (
          <div className="text-danger small mt-2">{error}</div>
        )}
      </div>
      <button 
        type="submit" 
        className="btn btn-brand w-100" 
        disabled={!stripe || processing || disabled}
      >
        {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
};
