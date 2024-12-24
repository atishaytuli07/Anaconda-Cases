'use server'

import { BASE_PRICE, PRODUCT_PRICES } from '@/config/products'
import { db } from '@/db'
import { stripe } from '@/lib/stripe'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { Order, Configuration } from '@prisma/client'

export const createCheckoutSession = async ({ configId }: { configId: string }) => {
  try {
    let configuration: Configuration | null = await db.configuration.findUnique({
      where: { id: configId },
    });
  
    if (!configuration) {
      configuration = await db.configuration.upsert({
        where: { id: "demo-config-id" },
        update: {},
        create: {
          id: "demo-config-id", 
          width: 200,
          height: 300,
          imageUrl: "https://via.placeholder.com/150",
          color: "black",
          model: "iphone12",
          material: "silicone",
          finish: "smooth",
        },
      });
    }

    // Get user session with error handling
    let user;
    try {
      const session = await getKindeServerSession();
      user = await session.getUser();
      
      if (!user?.id) {
        throw new Error("You need to be logged in");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      throw new Error("You need to be logged in");
    }

    let existingUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      existingUser = await db.user.create({
        data: {
          id: user.id,
          email: user.email ?? '',
        },
      });
    }

    // Calculate price
    const { finish, material } = configuration;
    let price = BASE_PRICE;
    if (finish === "textured") price += PRODUCT_PRICES.finish.textured;
    if (material === "polycarbonate") price += PRODUCT_PRICES.material.polycarbonate;

    // Find or create order
    let order = await db.order.findFirst({
      where: { userId: user.id, configurationId: configuration.id },
    });

    if (!order) {
      order = await db.order.create({
        data: {
          amount: price / 100,
          userId: user.id,
          configurationId: configuration.id,
        },
      });
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SERVER_URL) {
      throw new Error("Missing NEXT_PUBLIC_SERVER_URL environment variable");
    }

    const successUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/thank-you?orderId=${order.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/configure/preview?id=${configuration.id}`;

    // Create product in Stripe
    const product = await stripe.products.create({
      name: "Custom iPhone Case",
      images: [configuration.imageUrl],
      default_price_data: {
        currency: "USD",
        unit_amount: price,
      },
    });

    if (!product.default_price) {
      throw new Error("Failed to create default price for the product");
    }

    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ["card", "paypal"],
      mode: "payment",
      shipping_address_collection: { allowed_countries: ["DE", "US"] },
      metadata: {
        userId: user.id,
        orderId: order.id,
      },
      line_items: [{ price: product.default_price as string, quantity: 1 }],
    });

    if (!stripeSession.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return { url: stripeSession.url };

  } catch (error) {
    console.error("Checkout session error:", error);
    throw error;
  }
};