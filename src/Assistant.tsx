import { AppSidebar } from "@/components/app-sidebar";
import { Thread } from "@/components/assistant-ui/thread";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useState } from "react";
import Todos from "./Todos";

export const Assistant = () => {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  const [activeView, setActiveView] = useState<'threads' | 'mcp'>('threads');

  return (
    <AssistantRuntimeProvider runtime={runtime}>
        <SidebarProvider
          style={{
            '--sidebar-width': activeView === 'mcp' ? '24rem' : '16rem',
            '--sidebar-width-mobile': activeView === 'mcp' ? '24rem' : '18rem',
          } as React.CSSProperties}
        >
          <AppSidebar activeView={activeView} setActiveView={setActiveView} />
          <SidebarInset className="transition-all duration-300">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-all duration-300">
              <SidebarTrigger className="transition-transform duration-200 hover:scale-105" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb className="flex-1">
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#" className="hover:text-foreground transition-colors">
                      Build Your Own ChatGPT UX
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium">
                      Starter Template
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex h-[calc(100vh-4rem)] transition-all duration-300">
              {/* Chat area - takes up remaining space after accounting for sidebar and todos */}
              <div className="flex-1 overflow-hidden">
                <Thread />
              </div>
              {/* Sticky Todos panel - fixed width on the right */}
              <div className="w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="sticky top-0 h-[calc(100vh-4rem)] overflow-y-auto">
                  <Todos />
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
