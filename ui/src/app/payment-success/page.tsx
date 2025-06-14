"use client";

import { Suspense } from "react";
import SuccessContent from "./SuccessContent";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Finalizing your order...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

