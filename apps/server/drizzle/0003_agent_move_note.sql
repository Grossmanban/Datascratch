-- Agents may move a note between two agent-mode notebooks of their grant
-- (move_note): the docs.agent_update policy already requires both the old
-- and the new notebook to be writable by the grant.
GRANT UPDATE (notebook_id) ON docs TO ds_agent;
