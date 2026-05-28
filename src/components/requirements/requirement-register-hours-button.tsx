"use client";

import { useState } from "react";
import { TimeEntriesNewModal } from "@/components/time-entries/time-entries-new-modal";

export function RequirementRegisterHoursButton({ requirementId }: { requirementId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary py-2 text-sm" onClick={() => setOpen(true)}>
        + Registrar horas
      </button>
      <TimeEntriesNewModal
        autoOpen={false}
        open={open}
        onOpenChange={setOpen}
        defaultValues={{ requirementId }}
      />
    </>
  );
}
