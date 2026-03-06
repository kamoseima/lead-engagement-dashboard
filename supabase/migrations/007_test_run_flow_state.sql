-- Add flow_state column to test_runs for tracking position in multi-step flows.
-- Shape: { "flowId": "uuid", "stepPath": [0], "retryCount": 0 }

alter table test_runs add column flow_state jsonb;
