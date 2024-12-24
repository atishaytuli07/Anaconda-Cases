import { db } from '@/db'
import { notFound } from 'next/navigation'
import DesignPreview from './DesignPreview'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'

interface PageProps {
  searchParams: {
    [key: string]: string | string[] | undefined
  }
}

const Page = async ({ searchParams }: PageProps) => {
  const { id } = searchParams

  if (!id || typeof id !== 'string') {
    return notFound()
  }

  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (user?.id) {
    await db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email ?? ''
      },
      update: {}
    })
  }

  let configuration = await db.configuration.findUnique({
    where: { id },
  })

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
    })
  }

  return <DesignPreview configuration={configuration} />
}

export default Page
