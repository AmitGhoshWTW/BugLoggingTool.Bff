import React, { useEffect, useState } from "react";
import { getAllReports } from "../services/idb";

/**
 * SupervisorView
 * -----------------------------
 * Simple dashboard showing report counts.
 * Can be extended later into full analytics.
 */
export default function SupervisorView() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    getAllReports().then(setReports);
  }, []);

  const total = reports.length;
  const pending = reports.filter((r) => !r.synced).length;
  const resolved = total - pending;

  return (
    <div>
      <h3>Supervisor Dashboard</h3>
      <div>Total Reports: {total}</div>
      <div>Pending Sync: {pending}</div>
      <div>Synced: {resolved}</div>
    </div>
  );
}
