// components/IndustryExpertSelector.tsx
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import type { Industry } from "@/lib/config";

interface IndustryExpertSelectorProps {
  industries: Industry[];
  industry: string;
  onIndustryChange: (industry: string) => void;
  experts: string[];
  onExpertsChange: (experts: string[]) => void;
  currentIndustryExperts: string[];
  show: boolean;
}

export const IndustryExpertSelector: React.FC<IndustryExpertSelectorProps> = ({
  industries,
  industry,
  onIndustryChange,
  experts,
  onExpertsChange,
  currentIndustryExperts,
  show,
}) => {
  if (!show) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Индустрия</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between rounded-xl">
              {industry || "Выберите индустрию"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] rounded-xl border bg-white shadow-md">
            <div className="flex flex-col gap-2">
              {industries.map((ind) => (
                <button
                  key={ind.name}
                  onClick={() => onIndustryChange(ind.name)}
                  className={`text-left px-3 py-2 rounded-lg hover:bg-gray-100 ${industry === ind.name ? "bg-gray-200 font-semibold" : ""}`}
                >
                  {ind.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Эксперты</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between rounded-xl">
              {experts.length > 0 ? experts.join(", ") : "Выберите экспертов"}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] rounded-xl border bg-white shadow-md">
            <div className="flex flex-col gap-2">
              {currentIndustryExperts.map((ex) => {
                const checked = experts.includes(ex);
                return (
                  <label key={ex} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        if (val) {
                          onExpertsChange([...experts, ex]);
                        } else {
                          onExpertsChange(experts.filter((e) => e !== ex));
                        }
                      }}
                    />
                    <span>{ex}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};