'use server'

import { BASE_PRICE, PRODUCT_PRICES } from '@/config/products'
import { db } from '@/db'
import { stripe } from '@/lib/stripe'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { Order, Configuration } from '@prisma/client'

export const createCheckoutSession = async ({ configId }: { configId: string }) => {
    // Ensure that configuration can be found or fall back to dummy data
    let configuration: Configuration | null = await db.configuration.findUnique({
        where: { id: configId },
    });
  
    if (!configuration) {
        // If configuration does not exist, create a dummy one for testing
        const dummyConfiguration = await db.configuration.upsert({
            where: { id: "demo-config-id" }, // Ensure this ID is unique and available
            update: {}, // No update needed, just ensure it's there
            create: {
                id: "demo-config-id", // Unique config ID
                width: 200, // Example width
                height: 300, // Example height
                imageUrl: "https://via.placeholder.com/150", // Dummy image URL
                color: "black", // Adjust as per your schema's enum
                model: "iphone12", // Example model
                material: "silicone", // Example material
                finish: "smooth", // Example finish
            },
        });
    
        // Set the `configuration` to the dummy one
        configuration = dummyConfiguration;
    }
  
    // Get the user session
    const { getUser } = getKindeServerSession();
    const user = await getUser();
  
    if (!user) {
        throw new Error("You need to be logged in");
    }
  
    let existingUser = await db.user.findUnique({
        where: { id: user.id },
    });
  
    if (!existingUser) {
        existingUser = await db.user.create({
            data: {
                id: user.id,
                email: user.email ?? '', // Handle email being null, fallback to empty string if null
            },
        });
    }
  
    // Calculate price based on the configuration
    const { finish, material } = configuration;
    let price = BASE_PRICE;
    if (finish === "textured") price += PRODUCT_PRICES.finish.textured;
    if (material === "polycarbonate") price += PRODUCT_PRICES.material.polycarbonate;
  
    // Check if an order exists for this user and configuration
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
  
    // Create the product in Stripe
    const product = await stripe.products.create({
        name: "Custom iPhone Case",
        images: [configuration.imageUrl],
        default_price_data: {
            currency: "USD",
            unit_amount: price,
        },
    });
  
    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
        success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/thank-you?orderId=${order.id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/configure/preview?id=${configuration.id}`,
        payment_method_types: ["card", "paypal"],
        mode: "payment",
        shipping_address_collection: { allowed_countries: ["DE", "US"] },
        metadata: {
            userId: user.id,
            orderId: order.id,
        },
        line_items: [{ price: product.default_price, quantity: 1 }],
    });
  
    return { url: stripeSession.url };
};
