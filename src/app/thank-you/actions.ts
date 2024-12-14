'use server'

import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'

export const getPaymentStatus = async ({ orderId }: { orderId: string }) => {
  // Simulate demo mode for testing purposes
  const isDemo = true; // Toggle this for production vs demo

  if (isDemo) {
    // In demo mode, simulate a successful payment without checking user session
    const order = await db.order.findFirst({
      where: { id: orderId },
      include: {
        billingAddress: true,
        configuration: true,
        shippingAddress: true,
        user: true,
      },
    });

    if (!order) {
      // If the order does not exist, create a dummy one for testing
      const dummyOrder = await db.order.create({
        data: {
          id: orderId,
          userId: "demo-user", // Dummy user ID
          amount: 100, // Dummy amount
          isPaid: true, // Mark it as paid for demo
          configurationId: "demo-config-id", // Reference the created configuration
        },
      });
      return dummyOrder;
    }    
    

    // Update the order to mark it as paid (for demo purposes)
    if (!order.isPaid) {
      await db.order.update({
        where: { id: orderId },
        data: { isPaid: true },
      });
      return { ...order, isPaid: true };
    }

    return order; // Return the order as is if already paid
  }

  // Production logic
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id || !user.email) {
    throw new Error('You need to be logged in to view this page.');
  }

  // Find the order based on orderId and userId
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

  // Simulate marking the order as paid for production purposes
  if (!order.isPaid) {
    await db.order.update({
      where: { id: orderId },
      data: { isPaid: true },
    });

    return { ...order, isPaid: true };
  }

  return order;
};
