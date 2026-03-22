"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PostInlineEditProps {
  postId: string;
  currentSummary: string;
  onSave: (newSummary: string) => void;
  onCancel: () => void;
}

export function PostInlineEdit({ postId, currentSummary, onSave, onCancel }: PostInlineEditProps) {
  const [text, setText] = useState(currentSummary);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: text }),
    });
    setSaving(false);
    if (res.ok) onSave(text);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-input bg-background p-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex gap-1">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "..." : "Зберегти"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}
