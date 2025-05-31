import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Github, MessagesSquare, Server } from "lucide-react"
import * as React from "react"
import { ThreadList } from "./assistant-ui/thread-list"
import McpServer from "./McpServer"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeView: 'threads' | 'mcp';
  setActiveView: (view: 'threads' | 'mcp') => void;
}

export function AppSidebar({ activeView, setActiveView, ...props }: AppSidebarProps) {
  return (
    <Sidebar 
      {...props} 
      className="transition-all duration-300"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
                <a href="https://assistant-ui.com" target="_blank" className="flex items-center gap-2">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <MessagesSquare className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">assistant-ui</span>
                  </div>
                </a>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* View Toggle */}
        <div className="px-2 py-2">
          <div className="flex gap-1 p-1 bg-sidebar-accent/50 rounded-lg">
            <Button
              variant={activeView === 'threads' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('threads')}
              className="flex-1 h-7 text-xs"
            >
              <MessagesSquare className="h-3 w-3 mr-1" />
              Threads
            </Button>
            <Button
              variant={activeView === 'mcp' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('mcp')}
              className="flex-1 h-7 text-xs"
            >
              <Server className="h-3 w-3 mr-1" />
              MCP
            </Button>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {activeView === 'threads' ? <ThreadList /> : <McpServer />}
      </SidebarContent>

      <SidebarRail />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <a href="https://github.com/assistant-ui/assistant-ui" target="_blank" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Github className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">GitHub</span>
                  <span className="">View Source</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
