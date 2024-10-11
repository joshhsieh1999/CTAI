import Link from 'next/link'

import { Button } from '@/app/ui/button'
import { TextField } from '@/app/ui/fields'
import { Logo } from '@/app/ui/logo'
import { SlimLayout } from '@/app/ui/slim-layout'


export default function ContactUs() {
  return (
    <SlimLayout>
      <div className="flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>
      <h2 className="mt-20 text-lg font-semibold text-gray-900">
        Get started for now
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:underline"
        >
          Sign in
        </Link>{' '}
        to your account.
      </p>
      <form
        action="#"
        className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2"
      >
        <TextField
          label="First name"
          name="first_name"
          type="text"
          autoComplete="given-name"
          required
        />
        <TextField
          label="Last name"
          name="last_name"
          type="text"
          autoComplete="family-name"
          required
        />
        <TextField
          label="Organization"
          name="organization"
          type="text"
          autoComplete="organization"
          required
        />
        <TextField
          label="Title"
          name="title"
          type="text"
          autoComplete="title"
          required
        />
        <TextField
          className="col-span-full"
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          className="col-span-full"
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
        />
        <div className="col-span-full">
          <Button type="submit" variant="solid" color="blue" className="w-full">
            <span>
              Contact Us <span aria-hidden="true">&rarr;</span>
            </span>
          </Button>
        </div>
      </form>
    </SlimLayout>
  )
}
