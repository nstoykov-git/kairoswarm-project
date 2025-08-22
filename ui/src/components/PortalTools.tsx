// src/components/PortalTools.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

async function createPortal({
  name,
  description,
  actionSchema,
}: {
  name: string;
  description?: string;
  actionSchema?: Record<string, any>;
}) {
  const res = await fetch(`${API_BASE_URL}/portals/create-portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, action_schema: actionSchema || {} }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create portal");
  }
  return await res.json();
}

export default function PortalTools() {
  const router = useRouter();

  const [portalName, setPortalName] = useState("");
  const [description, setDescription] = useState("");
  const [actionSchema, setActionSchema] = useState("{}");
  const [portalID, setPortalID] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-black">Portal Creator</h1>
      <Button variant="secondary" onClick={() => router.push("/")}>
        ⬅ Back to Dashboard
      </Button>

      <label className="text-black font-semibold text-lg">Portal Name</label>
      <Input
        value={portalName}
        onChange={(e) => setPortalName(e.target.value)}
        placeholder="My Portal"
      />

      <label className="text-black font-semibold text-lg">Description</label>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What is this portal for?"
      />

      <label className="text-black font-semibold text-lg">Action Schema (JSON)</label>
      <Textarea
        value={actionSchema}
        onChange={(e) => setActionSchema(e.target.value)}
        placeholder='{ "example_action": { "type": "string" } }'
        rows={6}
      />

      <Button
        variant="default"
        disabled={!portalName.trim() || creating}
        onClick={async () => {
          try {
            setCreating(true);

            let schema: Record<string, any> = {};
            try {
              schema = JSON.parse(actionSchema);
            } catch (err) {
              toast.error("Invalid JSON in Action Schema");
              setCreating(false);
              return;
            }

            const portal = await createPortal({
              name: portalName,
              description,
              actionSchema: schema,
            });

            setPortalID(portal.portal_id);
            toast.success(`Portal "${portal.name}" created!`);
          } catch (err: any) {
            toast.error(err.message || "Portal creation failed.");
          } finally {
            setCreating(false);
          }
        }}
      >
        {creating ? "Creating..." : "Create Portal"}
      </Button>

      {portalID && (
        <Card className="bg-white text-black p-4 mt-4 border">
          <CardContent className="space-y-3">
            <div>
              <strong>Portal ID:</strong> {portalID}
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(portalID);
                toast.success("Portal ID copied!");
              }}
            >
              Copy Portal ID
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

