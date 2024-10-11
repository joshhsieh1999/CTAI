'use client'

import Link from 'next/link'

import { Button } from '@/app/ui/button'
import { Logo } from '@/app/ui/logo'
import { SlimLayout } from '@/app/ui/slim-layout'

export default function Error() {
  return (
    <SlimLayout>
      <div className="flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>
      <h1 className="mt-3 text-lg font-semibold text-gray-900">
        Error 
      </h1>
      <p className="mt-3 text-sm text-gray-700">
        Something went wrong. Please try again.
      </p>
      <Button href="/" className="mt-10">
        Go back home
      </Button>
    </SlimLayout>
  )
}
