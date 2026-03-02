'use client';

import { useInboxStore } from '@/lib/stores/inbox-store';
import { cn } from '@/lib/utils';
import { ContactDetailsTab } from './contact-details-tab';
import { ContactNotesTab } from './contact-notes-tab';
import { ContactActionsTab } from './contact-actions-tab';

const tabs = [
  { value: 'details' as const, label: 'Details' },
  { value: 'notes' as const, label: 'Notes' },
  { value: 'actions' as const, label: 'Actions' },
];

export function ContactSidebarPanel() {
  const { selectedConversation, sidebarTab, setSidebarTab } = useInboxStore();

  if (!selectedConversation) return null;

  return (
    <div className="flex h-full flex-col border-l border-border">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setSidebarTab(tab.value)}
            className={cn(
              'flex-1 px-3 py-2.5 text-xs font-medium transition-colors',
              sidebarTab === tab.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'details' && <ContactDetailsTab conversation={selectedConversation} />}
        {sidebarTab === 'notes' && <ContactNotesTab conversationId={selectedConversation.twilio_conversation_sid} />}
        {sidebarTab === 'actions' && <ContactActionsTab conversation={selectedConversation} />}
      </div>
    </div>
  );
}
