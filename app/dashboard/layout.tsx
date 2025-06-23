"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Home,
  Settings,
  Users,
  BarChart3,
  FileText,
  LogOut,
  User,
  Film,
  Video,
  Menu,
  X,
  Key,
  Tv,
  Camera,
  MonitorPlay,
  Clapperboard,
  HardDrive,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { Loader } from "@/components/ui/loader"
import { Toaster } from "@/components/ui/sonner"
import { GlobalSearch } from "@/components/global-search"
import { title } from "process"

// Navigation items 
const navItems = [
  {
    title: "Anime",
    url: "/dashboard/anime",
    icon: Tv,
  },
  {
    title: "Movies",
    url: "/dashboard/movies",
    icon: Film,
  },
  {
    title: "KM Movies",
    url: "/dashboard/kmmovies",
    icon: Camera,
  },
  {
    title: "DesireMovies",
    url: "/dashboard/desiremovies",
    icon: Clapperboard,
  },
  {
    title: "10 Bit",
    url: "/dashboard/10bitclub",
    icon: HardDrive,
  },
  {
   title: "VegaMovies",
   url: "/dashboard/vegamovies",
   icon: MonitorPlay,
  },
  {
    title: "API Keys",
    url: "/dashboard/api-keys",
    icon: Key,
  },
  {
    title: "Docs",
    url: "/dashboard/docs",
    icon: FileText,
  }
]

function AppSidebar() {
  const pathname = usePathname()
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="font-bold group-data-[collapsible=icon]:hidden">
              ScreenScape
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="data-[state=collapsed]:hidden font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url))
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <a 
                        href={item.url} 
                        className={`group-data-[state=collapsed]:justify-center font-medium transition-colors ${
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <item.icon className={isActive ? "text-primary-foreground" : ""} />
                        <span className="data-[state=collapsed]:hidden font-medium">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 text-center">
          <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Created and managed by
          </p>
          <p className="text-xs font-medium text-primary group-data-[collapsible=icon]:hidden">
            ScreenScape
          </p>
          <div className="group-data-[collapsible=icon]:block hidden">
            <div className="h-6 w-6 mx-auto rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">S</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function UserMenu() {
  const { user } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || "/avatars/01.png"} alt={user?.email} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Global navbar component - now exported
export function DashboardNavbar({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 bg-background z-10">
      <SidebarTrigger className="-ml-1" />
      <div className="flex flex-1 items-center justify-between">
        {title && (
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        )}
        {children}
        <div className="flex items-center gap-2 ml-auto">
          <GlobalSearch />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      
      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-black/20" 
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-background border-r shadow-lg">
            <div className="p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="mb-4"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <a
                    key={item.title}
                    href={item.url}
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <SidebarInset className="flex flex-col">
        <DashboardNavbar />
        {children}
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
