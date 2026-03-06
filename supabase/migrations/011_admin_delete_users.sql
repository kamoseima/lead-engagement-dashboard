-- Allow admins to delete users in their org
CREATE POLICY "Admins can delete org members"
  ON dashboard_users FOR DELETE
  USING (
    org_id = (SELECT org_id FROM dashboard_users WHERE id = auth.uid())
    AND (SELECT role FROM dashboard_users WHERE id = auth.uid()) = 'admin'
  );
