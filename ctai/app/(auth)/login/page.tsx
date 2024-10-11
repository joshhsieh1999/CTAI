'use client'

import { Button } from '@/app/ui/button'
import { TextField } from '@/app/ui/fields'
import { Logo } from '@/app/ui/logo'
import { SlimLayout } from '@/app/ui/slim-layout'
import { Spinner } from "@nextui-org/react"
import { getSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'react-toastify'


export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = ((e.target as HTMLFormElement).elements.namedItem('email') as HTMLInputElement).value;
    const password = ((e.target as HTMLFormElement).elements.namedItem('password') as HTMLInputElement).value;
    setIsLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setIsLoading(false);

    if (result && result.ok && !result.error) {
      toast.success("Login Successful", {
        position: "top-center",
        autoClose: 3000, // 持續5秒
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
        closeButton: false,

      });
      const session = await getSession();
      localStorage.setItem('userId', session!.user.id.toString());
      localStorage.setItem('username', session!.user.name);
      localStorage.setItem('organizationId', session!.user.organizationId.toString());
      localStorage.setItem('token', "\""+session!.user.CVATAuthToken+"\"");
      router.push(searchParams?.get("from") || `/project`);
    } else {
      console.error(result?.error);
      toast.error("Login failed: Incorrect email or password.", {
        position: "top-center",
        autoClose: 3000, // 持續5秒
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    }
  };

  return (
    <SlimLayout>
      <div className="flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>
      <h2 className="mt-20 text-lg font-semibold text-gray-900">
        Sign in to your account
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Don&apos;t have an account?{' '}
        <Link
          href="/contact-us"
          className="font-medium text-blue-600 hover:underline"
        >
          Contact Us
        </Link>{' '}
      </p>
      <form onSubmit={submit} className="mt-10 grid grid-cols-1 gap-y-8">
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <div>
          <Button type="submit" variant="solid" color="blue" className="w-full">
            <span>
              {isLoading ? <Spinner aria-label="Loading..." /> : "Sign in"}
            </span>
          </Button>
        </div>
      </form>
    </SlimLayout>
  )
}
