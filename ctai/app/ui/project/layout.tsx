'use client'

import { useState } from 'react'

import { DesktopProjectNav, MobileProjectNav } from '@/app/ui/project/nav'
import { Sidebar } from '@/app/ui/project/sidebar'


export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <Sidebar
        DesktopNav={DesktopProjectNav}
        MobileNav={MobileProjectNav}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className="py-10 lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  )
}
