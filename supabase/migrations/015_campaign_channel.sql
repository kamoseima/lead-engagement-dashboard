-- Campaign Channel
-- Adds a channel column to campaigns to distinguish WhatsApp vs Email campaigns.

ALTER TABLE campaigns
  ADD COLUMN channel text NOT NULL DEFAULT 'whatsapp';

COMMENT ON COLUMN campaigns.channel IS 'whatsapp | email — the delivery channel for this campaign';

CREATE INDEX idx_campaigns_channel ON campaigns(channel);
