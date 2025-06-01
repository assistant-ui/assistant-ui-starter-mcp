import { useState } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { createFileRoute } from '@tanstack/react-router';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Thread } from '@/entrypoints/sidepanel/components/assistant-ui/thread';
import { ThreadList } from '@/entrypoints/sidepanel/components/assistant-ui/thread-list';
import { Button } from '@/entrypoints/sidepanel/components/ui/button';

const Chat = () => {
  const runtime = useChatRuntime({
    api: '/api/chat',
  });
  const [isThreadListCollapsed, setIsThreadListCollapsed] = useState(false);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div
        className={`grid h-dvh gap-x-2 px-4 py-4 ${isThreadListCollapsed ? 'grid-cols-[auto_1fr]' : 'grid-cols-[200px_1fr]'}`}
      >
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="mb-2 self-end"
            onClick={() => setIsThreadListCollapsed(!isThreadListCollapsed)}
            aria-label={
              isThreadListCollapsed
                ? 'Expand thread list'
                : 'Collapse thread list'
            }
          >
            {isThreadListCollapsed ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          {!isThreadListCollapsed && <ThreadList />}
        </div>
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};

export const Route = createFileRoute('/chat/')({
  component: Chat,
});
