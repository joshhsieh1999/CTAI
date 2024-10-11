import Link from 'next/link'

import { HomeIcon } from '@heroicons/react/24/outline'


export function ReturnHome() {
  return (
    <>
      <Link
        href="/project"
        className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900 hover:bg-gray-50"
      >
        <HomeIcon className="h-8 w-8 rounded-full bg-gray-50" />
        <span className="sr-only">Your project</span>
        <span aria-hidden="true">Home</span>
      </Link>
    </>
  )
}
