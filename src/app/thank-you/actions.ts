'use server'

import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'

export const getPaymentStatus = async ({ orderId }: { orderId: string }) => {
  const isDemo = true; // Toggle this for production vs demo

  if (isDemo) {
    // In demo mode, fetch or create a dummy order for testing
    let order = await db.order.findFirst({
      where: { id: orderId },
      include: {
        billingAddress: true,
        configuration: true,
        shippingAddress: true,
        user: true,
      },
    });

    if (!order) {
      // Create a dummy configuration if not found
      const dummyConfig = await db.configuration.upsert({
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

      // Create a dummy order if not found
      order = await db.order.create({
        data: {
          id: orderId,
          userId: "demo-user",
          amount: 100, // Dummy amount
          isPaid: true, // Mark as paid for demo
          configurationId: dummyConfig.id,
        },
        include: {
          billingAddress: true,
          configuration: true,
          shippingAddress: true,
          user: true,
        },
      });
    }

    if (!order.isPaid) {
      // Mark the order as paid (for demo purposes)
      await db.order.update({
        where: { id: orderId },
        data: { isPaid: true },
      });
      order.isPaid = true;
    }

    return order;
  }

  // Production logic
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id || !user.email) {
    throw new Error('You need to be logged in to view this page.');
  }

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: {
      billingAddress: true,
      configuration: true,
      shippingAddress: true,
      user: true,
    },
  });

  if (!order) {
    throw new Error('This order does not exist.');
  }

  if (!order.isPaid) {
    await db.order.update({
      where: { id: orderId },
      data: { isPaid: true },
    });
    order.isPaid = true;
  }

  return order;
};
