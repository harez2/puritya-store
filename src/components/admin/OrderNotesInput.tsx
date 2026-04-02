import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface OrderNotesInputProps {
  onSubmit: (note: string) => Promise<void>;
  disabled?: boolean;
}

export function OrderNotesInput({ onSubmit, disabled }: OrderNotesInputProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        placeholder="Add an internal note..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="flex-1"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={submitting || !text.trim() || disabled}
        className="self-end"
      >
        <Send className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  );
}
