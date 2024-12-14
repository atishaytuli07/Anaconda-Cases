import { db } from '@/db'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import OrderReceivedEmail from '@/components/emails/OrderReceivedEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    // Simulate the body of a Stripe event
    const simulatedEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_details: {
            email: 'demo@user.com',
            name: 'Demo User',
            address: {
              city: 'Demo City',
              country: 'US',
              postal_code: '12345',
              line1: '123 Demo Street',
              state: 'Demo State',
            },
          },
          shipping_details: {
            address: {
              city: 'Demo City',
              country: 'US',
              postal_code: '12345',
              line1: '123 Demo Street',
              state: 'Demo State',
            },
          },
          metadata: {
            userId: 'demoUserId',
            orderId: 'demoOrderId',
          },
        },
      },
    };

    if (simulatedEvent.type === 'checkout.session.completed') {
      const session = simulatedEvent.data.object;

      // Mock order details for demonstration
      const mockOrder = {
        id: 'demoOrderId',
        createdAt: new Date(),
        shippingAddress: {
          name: session.customer_details.name,
          city: session.shipping_details.address.city,
          country: session.shipping_details.address.country,
          postalCode: session.shipping_details.address.postal_code,
          street: session.shipping_details.address.line1,
          state: session.shipping_details.address.state,
        },
      };

      console.log('Order Details:', mockOrder);

      // Simulate sending a confirmation message
      console.log('Sending confirmation email to:', session.customer_details.email);
    }

    // Respond with a success message
    return NextResponse.json({ message: 'Demo checkout session completed successfully', ok: true });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: 'Something went wrong during the demo checkout', ok: false },
      { status: 500 }
    );
  }
}
