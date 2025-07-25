"use client";

import { toast } from 'react-hot-toast';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

export default function PublishAgentPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  const [form, setForm] = useState({
    agentId: "",
    name: "",
    description: "",
    skills: "",
    price: "",
    isNegotiable: false,
    hasFreeTier: true,
    userId: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (user === null) {
      setErrorMessage("You must be logged in to publish an agent.");
      setStatus("error");
      router.push("/auth");
    } else {
      setForm((prev) => ({ ...prev, userId: user.id }));
    }
  }, [user, loading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setStatus("idle");
  setErrorMessage("");

  try {
    if (parseFloat(form.price) > 0 && (!user || !user.stripe_onboarding_complete)) {
      setErrorMessage("You must complete developer onboarding before publishing paid agents.");
      setStatus("error");
      toast.error("Please complete developer onboarding first.");
      router.push("/profile");
      return;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_MODAL_API_URL}/swarm/publish-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistant_id: form.agentId,
        name: form.name,
        description: form.description,
        skills: form.skills.split(",").map((s) => s.trim()),
        price: parseFloat(form.price),
        is_negotiable: form.isNegotiable,
        has_free_tier: form.hasFreeTier,
        user_id: form.userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      setErrorMessage(error.detail || "Something went wrong");
      setStatus("error");
      return;
    }

    setStatus("success");
    setShowToast(true);
  } catch (error) {
    setErrorMessage("Network error. Please try again.");
    setStatus("error");
  }
};


  const handleNewAgent = () => {
    setForm({
      agentId: "",
      name: "",
      description: "",
      skills: "",
      price: "",
      isNegotiable: false,
      hasFreeTier: true,
      userId: form.userId,
    });
    setStatus("idle");
    setShowToast(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem("kairoswarm_user_id");
    localStorage.removeItem("kairoswarm_user_email");
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700">
      <h1 className="text-3xl font-bold mb-6 text-center">Publish Your AI Agent</h1>

      {showToast && (
        <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 border border-green-300 rounded-lg text-sm">
          ✅ Agent published successfully.
        </div>
      )}

      {status === "success" ? (
        <div className="space-y-4 text-center">
          <p className="text-lg">Would you like to publish another agent?</p>
          <div className="flex justify-center gap-4">
            <Button onClick={handleNewAgent}>Yes</Button>
            <Button variant="ghost" onClick={handleLogout}>No, I’m done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="agentId">Assistant ID</Label>
            <Input name="agentId" value={form.agentId} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea name="description" value={form.description} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input name="skills" value={form.skills} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="price">Daily Rate ($)</Label>
            <Input name="price" type="number" value={form.price} onChange={handleChange} required />
            <p className="text-sm text-gray-500 mt-1">
              Publishing paid agents requires Stripe onboarding to ensure you get paid.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="isNegotiable" checked={form.isNegotiable} onChange={handleChange} />
            <Label htmlFor="isNegotiable">Negotiable</Label>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="hasFreeTier" checked={form.hasFreeTier} onChange={handleChange} />
            <Label htmlFor="hasFreeTier">Free tier available</Label>
          </div>

          <Button type="submit" className="w-full">Publish Agent</Button>

          {status === "error" && (
            <p className="text-red-600 mt-2 text-sm">❌ {errorMessage}</p>
          )}
        </form>
      )}
    </div>
  );
}
