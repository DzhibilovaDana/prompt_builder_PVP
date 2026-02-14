// src/components/IndustryExpertSelector.tsx
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
  expertWeights?: Record<string, number>;
  onExpertWeightChange?: (expert: string, weight: number) => void;
}

export const IndustryExpertSelector: React.FC<IndustryExpertSelectorProps> = ({
  industries,
  industry,
  onIndustryChange,
  experts,
  onExpertsChange,
  currentIndustryExperts,
  show,
  expertWeights = {},
  onExpertWeightChange,
}) => {
  if (!show) return null;

  const toggleExpert = (ex: string, checked: boolean) => {
    if (checked) {
      // add
      if (!experts.includes(ex)) onExpertsChange([...experts, ex]);
    } else {
      onExpertsChange(experts.filter((e) => e !== ex));
    }
  };

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
          <PopoverContent className="w-[320px] rounded-xl border bg-white shadow-md">
            <div className="flex flex-col gap-3">
              {currentIndustryExperts.map((ex) => {
                const checked = experts.includes(ex);
                const weight = expertWeights[ex] ?? 100;
                return (
                  <div key={ex} className="flex flex-col gap-1 px-2 py-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => {
                          toggleExpert(ex, !!val);
                        }}
                      />
                      <span className="flex-1">{ex}</span>
                      <span className="text-xs text-gray-500">{weight}%</span>
                    </label>

                    {/* Slider visible only when checked */}
                    {checked && (
                      <div className="ml-7 mr-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={weight}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (onExpertWeightChange) onExpertWeightChange(ex, v);
                          }}
                          className="w-full"
                          aria-label={`Вес эксперта ${ex}`}
                        />
                        <div className="mt-1 text-xs text-gray-500">Вес: {weight}% — влияет на порядок и влияние в промпте</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
