"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SourceFilterProps {
  labels: string[];
  value: string;
  onChange: (value: string) => void;
}

export function SourceFilter({ labels, value, onChange }: SourceFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[240px] bg-card">
        <SelectValue placeholder="Seleccionar ventana" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las ventanas</SelectItem>
        {labels.map((label) => (
          <SelectItem key={label} value={label}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
