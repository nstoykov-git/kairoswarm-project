"use client";

import { Suspense } from "react";
import ReviewContent from "./ReviewContent";

export default function PaymentReviewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading review...</div>}>
      <ReviewContent />
    </Suspense>
  );
}

