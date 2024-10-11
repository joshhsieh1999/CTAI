'use client'

import { useState } from 'react'

import { DesktopDashNav, MobileDashNav } from '@/app/ui/dashboard/nav'
import { Sidebar } from '@/app/ui/dashboard/sidebar'


export default function DashLayout({
  bg = 'bg-white',
  children,
}: {
  bg? : string,
  children: React.ReactNode,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <Sidebar
        DesktopNav={DesktopDashNav}
        MobileNav={MobileDashNav}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className={`py-10 lg:pl-72 ${bg}`}>
        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  )
}
